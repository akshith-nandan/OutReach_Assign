import { Router } from 'express';
import { loginOrRegisterGoogleUser, getCurrentUser } from '../controllers/authController';
import { getUserSenders, createSender } from '../controllers/senderController';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  searchEmailsEndpoint,
} from '../controllers/emailController';
import {
  getSlackStatus,
  disconnectSlack,
  testSlackNotification,
  startSlackOAuth,
  slackOAuthCallback,
} from '../controllers/slackController';
import { emailQueue } from '../queue';
import { requireAuth } from '../auth';
const router = Router();
// Auth routes
router.get('/auth/google/config', (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: 'Google sign-in is not configured on the backend.' });
  }
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ clientId });
});
router.post('/auth/google', loginOrRegisterGoogleUser);
router.get('/slack/oauth/callback', slackOAuthCallback);
router.use(requireAuth);
router.get('/auth/me', getCurrentUser);
// Sender routes
router.get('/senders', getUserSenders);
router.post('/senders', createSender);
// Email scheduling routes
router.post('/emails/schedule', scheduleEmails);
router.get('/emails/scheduled', getScheduledEmails);
router.get('/emails/sent', getSentEmails);
router.get('/emails/search', searchEmailsEndpoint);
// Slack integration routes
router.get('/slack/oauth/start', startSlackOAuth);
router.get('/slack/status', getSlackStatus);
router.post('/slack/disconnect', disconnectSlack);
router.post('/slack/test', testSlackNotification);
// Queue statistics endpoint
router.get('/queue/stats', async (req, res) => {
  try {
    const jobCounts = await emailQueue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting');
    return res.json({ stats: jobCounts });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
export default router;
