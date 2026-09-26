import { Request, Response } from 'express';
import prisma from '../db';
import { createEtherealAccount } from '../ethereal';
import { createSessionToken, verifyGoogleCredential } from '../auth';
export async function loginOrRegisterGoogleUser(req: Request, res: Response) {
  try {
    const credential = req.body?.credential;
    if (typeof credential !== 'string' || !credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }
    const googleProfile = await verifyGoogleCredential(credential);
    const user = await prisma.user.upsert({
      where: { email: googleProfile.email! },
      update: {
        googleId: googleProfile.sub,
        name: googleProfile.name || undefined,
        avatar: googleProfile.picture || undefined,
      },
      create: {
        email: googleProfile.email!,
        name: googleProfile.name || googleProfile.email!.split('@')[0],
        avatar: googleProfile.picture,
        googleId: googleProfile.sub,
      },
      select: { id: true, email: true, name: true, avatar: true },
    });
    const hasSender = await prisma.sender.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (!hasSender) {
      // Automatically create a default Ethereal fake SMTP sender for this user
      const etherealCreds = await createEtherealAccount();
      await prisma.sender.create({
        data: {
          userId: user.id,
          name: user.name || 'Default Sender',
          email: user.email,
          smtpHost: etherealCreds.smtpHost,
          smtpPort: etherealCreds.smtpPort,
          smtpUser: etherealCreds.user,
          smtpPass: etherealCreds.pass,
          hourlyLimit: 100,
          delayBetweenEmails: 2,
        },
      });
    }
    return res.json({
      message: 'Authentication successful',
      user,
      token: createSessionToken(user.id),
    });
  } catch (error: any) {
    console.error('Auth Controller Error:', error);
    return res.status(401).json({ error: error.message || 'Google authentication failed.' });
  }
}
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Missing x-user-id header' });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        senders: {
          select: { id: true, email: true, name: true, hourlyLimit: true, delayBetweenEmails: true },
        },
        slackConnection: { select: { channelName: true } },
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
