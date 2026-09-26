import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();
export const redisHost = process.env.REDIS_HOST || 'localhost';
export const redisPort = parseInt(process.env.REDIS_PORT || '6379');
export const redisConnection = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});
redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});
export default redisConnection;