import { Request, Response } from 'express';
import prisma from '../db';
import { addEmailJobToQueue } from '../queue';
import { indexEmailJob, searchEmails } from '../elasticsearch';
export async function scheduleEmails(req: Request, res: Response) {
  try {
    const userId = req.userId;
    const {
      senderId,
      subject,
      body,
      recipients, // string array of lead email addresses
      startTime, // ISO string or timestamp
      delayBetweenSeconds,
      hourlyLimit,
    } = req.body;
    if (!userId || !subject?.trim() || !body?.trim() || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: userId, subject, body, and non-empty recipients array are required.',
      });
    }
    if (recipients.length > 10000 || recipients.some((email: unknown) => typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return res.status(400).json({ error: 'Recipients must be valid email addresses; up to 10,000 can be scheduled per request.' });
    }
    const activeSender = senderId
      ? await prisma.sender.findFirst({ where: { id: senderId, userId } })
      : await prisma.sender.findFirst({ where: { userId } });
    if (!activeSender) {
      return res.status(400).json({ error: 'No valid sender found for this user.' });
    }
    const startDateTime = startTime ? new Date(startTime) : new Date();
    if (Number.isNaN(startDateTime.getTime())) {
      return res.status(400).json({ error: 'startTime must be a valid date.' });
    }
    const delaySec = Number(delayBetweenSeconds ?? process.env.DEFAULT_DELAY_SECONDS ?? 2);
    const limitHr = Number(hourlyLimit ?? process.env.DEFAULT_HOURLY_LIMIT ?? 100);
    if (!Number.isInteger(delaySec) || delaySec < 0 || !Number.isInteger(limitHr) || limitHr < 1) {
      return res.status(400).json({ error: 'Delay must be a non-negative integer and hourly limit must be a positive integer.' });
    }
    // Create Campaign record
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        subject,
        body,
        startTime: startDateTime,
        delayBetweenSeconds: delaySec,
        hourlyLimit: limitHr,
      },
    });
    const emailJobsToCreate: any[] = [];
    // Calculate scheduledAt timestamp for each recipient lead with inter-email delay
    recipients.forEach((recipientEmail: string, index: number) => {
      const scheduledTimeMs = startDateTime.getTime() + index * delaySec * 1000;
      const scheduledAt = new Date(scheduledTimeMs);
      emailJobsToCreate.push({
        campaignId: campaign.id,
        senderId: activeSender!.id,
        recipientEmail: recipientEmail.trim(),
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt,
      });
    });
    // Save EmailJobs in DB transaction or createMany
    await prisma.emailJob.createMany({
      data: emailJobsToCreate,
    });
    // Retrieve created jobs with IDs to schedule in BullMQ and index in ES
    const createdJobs = await prisma.emailJob.findMany({
      where: { campaignId: campaign.id },
      orderBy: { scheduledAt: 'asc' },
    });
    // Schedule each job in BullMQ & index in Elasticsearch
    for (const job of createdJobs) {
      const delayMs = Math.max(0, new Date(job.scheduledAt).getTime() - Date.now());
      await addEmailJobToQueue(job.id, delayMs);
      await indexEmailJob({ ...job, userId });
    }
    return res.status(201).json({
      message: `Successfully scheduled ${createdJobs.length} emails.`,
      campaignId: campaign.id,
      scheduledCount: createdJobs.length,
    });
  } catch (error: any) {
    console.error('Error scheduling emails:', error);
    return res.status(500).json({ error: error.message || 'Failed to schedule emails.' });
  }
}
export async function getScheduledEmails(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const scheduledJobs = await prisma.emailJob.findMany({
      where: {
        campaign: { userId },
        status: { in: ['SCHEDULED', 'QUEUED', 'RATE_LIMITED_DELAYED'] },
      },
      include: {
        sender: { select: { id: true, email: true, name: true } },
        campaign: { select: { id: true, subject: true, startTime: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return res.json({ scheduledEmails: scheduledJobs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
export async function getSentEmails(req: Request, res: Response) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const sentJobs = await prisma.emailJob.findMany({
      where: {
        campaign: { userId },
        status: { in: ['SENT', 'FAILED'] },
      },
      include: {
        sender: { select: { id: true, email: true, name: true } },
        campaign: { select: { id: true, subject: true, startTime: true } },
      },
      orderBy: { sentAt: 'desc' },
    });
    return res.json({ sentEmails: sentJobs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
export async function searchEmailsEndpoint(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || '';
    const status = (req.query.status as string) || '';
    // First try Elasticsearch search
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const esHits = await searchEmails(userId, q, status);
    if (esHits && esHits.length > 0) {
      return res.json({ results: esHits, source: 'elasticsearch' });
    }
    // Fall back to PostgreSQL search if Elasticsearch has no hits.
    const dbWhere: any = { campaign: { userId } };
    if (status) {
      dbWhere.status = status;
    }
    if (q) {
      dbWhere.OR = [
        { recipientEmail: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }
    const dbJobs = await prisma.emailJob.findMany({
      where: dbWhere,
      take: 100,
      orderBy: { scheduledAt: 'desc' },
    });
    return res.json({ results: dbJobs, source: 'database' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
