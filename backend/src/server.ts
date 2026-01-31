// Entry point for backend API server
// - sets up Express app
// - connects to MongoDB and Redis
// - mounts routes

import express from 'express';
import cors from 'cors';
import connectDb from './config/db';
import createRedis from './config/redis';
import morgan from 'morgan';
import env from './config/env';

import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import pixelRoutes from './routes/pixel.routes';
import trackingRoutes from './routes/tracking.routes';
import analyticsRoutes from './routes/analytics.routes';
import billingRoutes from './routes/billing.routes';
import statsRoutes from './routes/stats.routes';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/_health', (req, res) => res.json({ status: 'ok' }));

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
  app.use('/t', pixelRoutes);
app.use('/api/stats', statsRoutes);

// Start services and then listen
const start = async () => {
  try {
    await connectDb(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create Redis client (used by BullMQ and workers)
    const redis = createRedis(env.REDIS_URL);
    redis.on('connect', () => console.log('Connected to Redis'));
    redis.on('error', (err: any) => console.error('Redis error', err));

    const PORT = env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });

    // Export redis after startup so other modules can import it
    // (keep default export for app for tests)
    // @ts-ignore - augment runtime export
    (module.exports as any).redis = redis;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

export default app;
