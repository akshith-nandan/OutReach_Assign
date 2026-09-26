import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData } from './queue';
import { redisConnectionOptions, redisConnection } from './redis';
import prisma from './db';
import { sendEmailViaEthereal } from './ethereal';
import { indexEmailJob } from './elasticsearch';
import { sendSlackRateLimitNotification } from './slack';
import dotenv from 'dotenv';
dotenv.config();
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
export function getHourlyRedisKey(senderId: string, date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return `rate_limit:${senderId}:${yyyy}-${mm}-${dd}-${hh}`;
}
export function getNextHourTimestamp(date = new Date()): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  return next;
}

async function reserveSendSlot(senderId: string, intervalSeconds: number): Promise<number> {
  if (intervalSeconds <= 0) return 0;
  const delayMs = await redisConnection.eval(
    `local time = redis.call('TIME')
     local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
     local nextSlot = tonumber(redis.call('GET', KEYS[1]) or now)
     local slot = math.max(now, nextSlot)
     redis.call('SET', KEYS[1], slot + tonumber(ARGV[1]), 'PX', math.max(60000, tonumber(ARGV[1]) * 10))
     return slot - now`,
    1,
    `send_slot:${senderId}`,
    String(intervalSeconds * 1000)
  );
  return Number(delayMs);
}

async function consumeHourlyQuota(key: string, limit: number): Promise<number> {
  const count = await redisConnection.eval(
    `local current = tonumber(redis.call('GET', KEYS[1]) or '0')
     local maximum = tonumber(ARGV[1])
     if current >= maximum then return 0 end
     local next = redis.call('INCR', KEYS[1])
     if next == 1 then redis.call('EXPIRE', KEYS[1], 7200) end
     return next`,
    1,
    key,
    String(limit)
  );
  return Number(count);
}

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { emailJobId } = job.data;
    console.log(`[Worker] Processing email job: ${emailJobId}`);
    const emailJob = await prisma.emailJob.findUnique({
      where: { id: emailJobId },
      include: {
        sender: true,
        campaign: {
          include: {
            user: true,
          },
        },
      },
    });
    if (!emailJob) {
      console.warn(`[Worker] EmailJob ${emailJobId} not found in DB.`);
      return;
    }
    if (emailJob.status === 'SENT') {
      console.log(`[Worker] EmailJob ${emailJobId} already sent. Skipping (Idempotency).`);
      return;
    }
    const { sender, campaign } = emailJob;
    const userId = campaign.userId;
    const hourlyLimit = campaign.hourlyLimit ?? sender.hourlyLimit ?? Number(process.env.DEFAULT_HOURLY_LIMIT || 100);
    const delayBetweenSeconds = campaign.delayBetweenSeconds ?? sender.delayBetweenEmails ?? Number(process.env.DEFAULT_DELAY_SECONDS || 2);
    const redisKey = getHourlyRedisKey(sender.id);
    const currentCount = await consumeHourlyQuota(redisKey, hourlyLimit);
    if (currentCount === 0) {
      console.warn(
        `[Worker] Hourly limit reached for sender ${sender.email} (${hourlyLimit}/${hourlyLimit}). Rescheduling job ${emailJobId}.`
      );
      const nextHour = getNextHourTimestamp();
      const delayMs = nextHour.getTime() - Date.now() + Math.floor(Math.random() * 2000); // 0-2s jitter
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'RATE_LIMITED_DELAYED',
          scheduledAt: nextHour,
        },
      });
      // Re-queue in BullMQ for top of next hour window
      const { emailQueue } = await import('./queue.js');
      await emailQueue.add(
        'send-email',
        { emailJobId },
        {
          delay: Math.max(1000, delayMs),
          jobId: `${emailJobId}_rescheduled_${nextHour.getTime()}`,
        }
      );
      const alertKey = `rate_limit_alert:${sender.id}:${redisKey}`;
      const shouldNotify = await redisConnection.set(alertKey, '1', 'EX', 7200, 'NX');
      if (shouldNotify) {
        const notificationSent = await sendSlackRateLimitNotification(
          userId,
          sender.email,
          hourlyLimit,
          1,
          nextHour.toISOString()
        );
        if (!notificationSent) {
          if ((await redisConnection.get(`slack:connected:${userId}`)) === '0') {
            await redisConnection.del(alertKey);
          } else {
            await redisConnection.expire(alertKey, 60);
          }
        }
      }
      // Sync updated state to Elasticsearch
      indexEmailJob({
        ...emailJob,
        userId: campaign.userId,
        status: 'RATE_LIMITED_DELAYED',
        scheduledAt: nextHour,
      });
      return { status: 'RATE_LIMITED_DELAYED', nextAvailableWindow: nextHour.toISOString() };
    }
    const slotDelayMs = await reserveSendSlot(sender.id, delayBetweenSeconds);
    if (slotDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, slotDelayMs));
    }
    try {
      // Send email via Ethereal SMTP
      const result = await sendEmailViaEthereal({
        smtpUser: sender.smtpUser,
        smtpPass: sender.smtpPass,
        senderName: sender.name,
        senderEmail: sender.email,
        recipientEmail: emailJob.recipientEmail,
        subject: emailJob.subject,
        body: emailJob.body,
      });
      const updatedJob = await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          etherealUrl: result.previewUrl || null,
          bullJobId: job.id,
        },
      });
      console.log(`[Worker] Email sent successfully to ${emailJob.recipientEmail}. Ethereal Preview: ${result.previewUrl}`);
      // Sync to Elasticsearch
      await indexEmailJob({ ...updatedJob, userId: campaign.userId });
      return { status: 'SENT', previewUrl: result.previewUrl };
    } catch (error: any) {
      console.error(`[Worker] Error sending email ${emailJobId}:`, error);
      const failedJob = await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'SMTP sending error',
        },
      });
      await indexEmailJob({ ...failedJob, userId: campaign.userId });
      throw error;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: concurrency,
  }
);
emailWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});
emailWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err);
});
