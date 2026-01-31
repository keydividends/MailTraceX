# Mail TraceX

Monorepo skeleton for Mail TraceX — a SaaS for email tracking & analytics.

This repository contains scaffolding for:

- `backend` — Node.js + Express + TypeScript + MongoDB + BullMQ workers
- `web` — Next.js + Tailwind CSS frontend (App Router)
- `extension` — Chrome extension (Manifest V3)
- `shared` — shared TypeScript types and constants

Use this skeleton to implement business logic, wire up services, and run local development.

Local services via Docker
------------------------

You can run MongoDB and Redis locally with Docker Compose (used for development):

```bash
docker compose up -d
```

This will start:
- MongoDB on `mongodb://localhost:27017` (database `mailtracex`)
- Redis on `redis://localhost:6379`

Stop and remove containers:

```bash
docker compose down
```

Make sure your backend `.env` points to these endpoints (see `backend/.env.example`).

Run without Docker (macOS)
--------------------------

If you prefer not to use Docker, you can run services locally using Homebrew to install MongoDB and Redis and run the apps with Node:

1. Install services:

```bash
brew update
# Redis
brew install redis
brew services start redis

# MongoDB (Community)
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

2. Install Node and project deps (use `bin/setup`):

```bash
cd /Users/radharupagumpa/Projects/MailTraceX
bash ./bin/setup
```

3. Run backend and frontend in separate terminals:

```bash
cd backend && npm run dev
# in another terminal
cd web && npm run dev
```

4. Check endpoints:

 - Backend health: `http://localhost:4000/_health`
 - Frontend: `http://localhost:3000/`

See each package for README notes and install/run instructions.

