import { Request, Response } from 'express';
import prisma from '../db';
import { createEtherealAccount } from '../ethereal';
export async function getUserSenders(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const senders = await prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true, email: true, name: true, hourlyLimit: true, delayBetweenEmails: true, createdAt: true },
    });
    return res.json({ senders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
export async function createSender(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const { name, email, hourlyLimit, delayBetweenEmails } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ error: 'email is required' });
    }
    const etherealCreds = await createEtherealAccount();
    const sender = await prisma.sender.create({
      data: {
        userId,
        name: name || email.split('@')[0],
        email,
        smtpHost: etherealCreds.smtpHost,
        smtpPort: etherealCreds.smtpPort,
        smtpUser: etherealCreds.user,
        smtpPass: etherealCreds.pass,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : Number(process.env.DEFAULT_HOURLY_LIMIT || 100),
        delayBetweenEmails: delayBetweenEmails !== undefined
          ? parseInt(delayBetweenEmails, 10)
          : Number(process.env.DEFAULT_DELAY_SECONDS || 2),
      },
    });
    const safeSender = await prisma.sender.findUnique({
      where: { id: sender.id },
      select: { id: true, userId: true, email: true, name: true, hourlyLimit: true, delayBetweenEmails: true, createdAt: true },
    });
    return res.status(201).json({ sender: safeSender });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
