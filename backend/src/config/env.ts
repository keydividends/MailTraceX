// Environment helpers and defaults
// Loads `.env` from the project root when present.
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

export const PORT = Number(process.env.PORT || 4000);
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailtracex';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export default { PORT, MONGODB_URI, REDIS_URL, JWT_SECRET };
