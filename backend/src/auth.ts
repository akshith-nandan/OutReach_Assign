import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';

const googleClient = new OAuth2Client();

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

export function createSessionToken(userId: string): string {
  return jwt.sign({}, getJwtSecret(), { subject: userId, expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const claims = jwt.verify(token, getJwtSecret());
    if (typeof claims === 'string' || !claims.sub) {
      return res.status(401).json({ error: 'Invalid session token.' });
    }
    req.userId = claims.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

export async function verifyGoogleCredential(credential: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID.');
  }
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new Error('Google did not return a verified account.');
  }
  return payload;
}