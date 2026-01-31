# Backend

Node.js + Express + TypeScript backend for Mail TraceX.

Run locally:

1. cd backend
2. npm install
3. npm run dev

Connect to MongoDB and Redis via environment variables. Copy `backend/.env.example` to `.env` and set real values.

Example `.env` fields:

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`

