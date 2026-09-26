import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();
export const redisHost = process.env.REDIS_HOST || 'localhost';
export const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisUrl = process.env.REDIS_URL;

export const redisConnectionOptions = (() => {
  if (!redisUrl) {
    return { host: redisHost, port: redisPort, maxRetriesPerRequest: null };
  }

  const parsedUrl = new URL(redisUrl);
  if (parsedUrl.protocol !== 'redis:' && parsedUrl.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use the redis:// or rediss:// protocol.');
  }

  const database = parsedUrl.pathname.length > 1 ? Number(parsedUrl.pathname.slice(1)) : undefined;
  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || (parsedUrl.protocol === 'rediss:' ? 6380 : 6379)),
    username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
    password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
    db: Number.isInteger(database) ? database : undefined,
    ...(parsedUrl.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
})();

export const redisConnection = redisUrl
  ? new Redis(redisUrl, { maxRetriesPerRequest: null })
  : new Redis(redisConnectionOptions);
redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});
export default redisConnection;