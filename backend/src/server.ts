import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { setupBullBoard } from './bullBoard';
import { initElasticsearch } from './elasticsearch';
import './worker'; // Import worker to start BullMQ job processing
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Attach BullMQ Admin Dashboard router at /admin/queues
const bullBoardRouter = setupBullBoard();
app.use('/admin/queues', bullBoardRouter);
// Attach API Routes
app.use('/api', apiRouter);
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ReachInbox Email Job Scheduler' });
});
async function startServer() {
  try {
    // Initialize Elasticsearch Index
    await initElasticsearch();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 ReachInbox Backend running on http://localhost:${PORT}`);
      console.log(`📊 BullMQ Dashboard: http://localhost:${PORT}/admin/queues`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
}
startServer();
