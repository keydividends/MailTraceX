// Redis client setup (ioredis)
import Redis from 'ioredis';

export function createRedis(url?: string) {
  return new Redis(url || process.env.REDIS_URL || 'redis://localhost:6379');
}

export default createRedis;
