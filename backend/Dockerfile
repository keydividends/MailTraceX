# backend Dockerfile - builds TypeScript and runs compiled Node app
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build || npx tsc -p tsconfig.json

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
EXPOSE 4000
CMD ["node", "dist/server.js"]
