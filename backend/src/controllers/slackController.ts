import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import prisma from '../db';
import { sendSlackRateLimitNotification } from '../slack';
import { redisConnection } from '../redis';

const slackStatePrefix = 'slack:oauth:state:';

export async function startSlackOAuth(req: Request, res: Response) {
  try {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!clientId || !redirectUri) {
      return res.status(503).json({ error: 'Slack OAuth is not configured.' });
    }
    const state = randomBytes(24).toString('hex');
    await redisConnection.set(`${slackStatePrefix}${state}`, req.userId, 'EX', 600, 'NX');
    const authorizeUrl = new URL('https://slack.com/oauth/v2/authorize');
    authorizeUrl.search = new URLSearchParams({
      client_id: clientId,
      scope: 'chat:write,incoming-webhook',
      redirect_uri: redirectUri,
      state,
    }).toString();
    return res.json({ authorizeUrl: authorizeUrl.toString() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Unable to start Slack authorization.' });
  }
}

export async function slackOAuthCallback(req: Request, res: Response) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    const { code, state, error } = req.query;
    if (error || typeof code !== 'string' || typeof state !== 'string') {
      return res.redirect(`${frontendUrl}/?slack=cancelled`);
    }
    const stateKey = `${slackStatePrefix}${state}`;
    const userId = await redisConnection.get(stateKey);
    if (!userId) {
      return res.redirect(`${frontendUrl}/?slack=invalid-state`);
    }
    await redisConnection.del(stateKey);
    const body = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || '',
      client_secret: process.env.SLACK_CLIENT_SECRET || '',
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI || '',
    });
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const tokenData = await tokenResponse.json() as {
      ok?: boolean;
      error?: string;
      access_token?: string;
      incoming_webhook?: { url?: string; channel?: string };
    };
    if (!tokenResponse.ok || !tokenData.ok || !tokenData.incoming_webhook?.url) {
      throw new Error(tokenData.error || 'Slack did not return an incoming webhook.');
    }
    await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        accessToken: tokenData.access_token || null,
        incomingWebhookUrl: tokenData.incoming_webhook.url,
        channelName: tokenData.incoming_webhook.channel || 'Slack channel',
      },
      create: {
        userId,
        accessToken: tokenData.access_token || null,
        incomingWebhookUrl: tokenData.incoming_webhook.url,
        channelName: tokenData.incoming_webhook.channel || 'Slack channel',
      },
    });
    await redisConnection.set(`slack:connected:${userId}`, '1', 'EX', 60);
    return res.redirect(`${frontendUrl}/?slack=connected`);
  } catch (error: any) {
    console.error('[Slack OAuth] Callback failed:', error.message);
    return res.redirect(`${frontendUrl}/?slack=error`);
  }
}

export async function getSlackStatus(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId },
    });
    return res.json({
      connected: !!slackConn?.incomingWebhookUrl,
      slackConnection: slackConn ? { channelName: slackConn.channelName } : null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
export async function disconnectSlack(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    await prisma.slackConnection.deleteMany({
      where: { userId },
    });
    await redisConnection.set(`slack:connected:${userId}`, '0', 'EX', 60);
    return res.json({ message: 'Slack disconnected successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
export async function testSlackNotification(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const { senderEmail } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    await sendSlackRateLimitNotification(
      userId,
      senderEmail || 'sender@example.com',
      100,
      5,
      new Date(Date.now() + 3600000).toISOString()
    );
    return res.json({ message: 'Slack test notification dispatched' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
