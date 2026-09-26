import { Queue } from 'bullmq';
import { redisHost, redisPort } from './redis';
export const EMAIL_QUEUE_NAME = 'email-queue';
export interface EmailJobData {
  emailJobId: string;
}
export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: {
    host: redisHost,
    port: redisPort,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});
export async function addEmailJobToQueue(emailJobId: string, delayMs: number) {
  return await emailQueue.add(
    'send-email',
    { emailJobId },
    {
      delay: Math.max(0, delayMs),
      jobId: emailJobId, // Guarantees idempotency in BullMQ
    }
  );
}
