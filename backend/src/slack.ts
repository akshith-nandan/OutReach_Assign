import prisma from './db';
import { redisConnection } from './redis';

const slackConnectionCachePrefix = 'slack:connected:';

export async function sendSlackRateLimitNotification(
  userId: string,
  senderEmail: string,
  hourlyLimit: number,
  rescheduledCount: number,
  nextAvailableTime: string
) {
  try {
    const cacheKey = `${slackConnectionCachePrefix}${userId}`;
    const cachedConnection = await redisConnection.get(cacheKey);
    if (cachedConnection === '0') return false;
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId },
    });
    if (!slackConn || (!slackConn.incomingWebhookUrl && !slackConn.accessToken)) {
      await redisConnection.set(cacheKey, '0', 'EX', 60);
      console.log(`[Slack] No active Slack connection found for user ${userId}. Skipping alert notification.`);
      return false;
    }
    await redisConnection.set(cacheKey, '1', 'EX', 60);
    const messagePayload = {
      text: `⚠️ *ReachInbox Email Scheduler Alert: Rate Limit Exceeded*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ ReachInbox Hourly Rate Limit Hit',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:* ${senderEmail}`,
            },
            {
              type: 'mrkdwn',
              text: `*Configured Limit:* ${hourlyLimit} emails/hour`,
            },
            {
              type: 'mrkdwn',
              text: `*Delayed Email Jobs:* ${rescheduledCount}`,
            },
            {
              type: 'mrkdwn',
              text: `*Next Sending Window:* ${nextAvailableTime}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `ℹ️ Jobs have been automatically rescheduled into the next hour window without data loss.`,
            },
          ],
        },
      ],
    };
    if (slackConn.incomingWebhookUrl) {
      const response = await fetch(slackConn.incomingWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
      });
      if (response.ok) {
        console.log(`[Slack Notification Sent] Successfully posted rate limit alert for ${senderEmail}`);
        return true;
      } else {
        console.error(`[Slack Notification Failed] Webhook status: ${response.status}`);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('[Slack Notification Error]', error);
    return false;
  }
}
