# Makefile for Mail TraceX
# Targets:
#  - setup: install node (via bin/setup) and workspace deps
#  - up / down: bring up docker compose local stack
#  - build-images: build backend and web docker images locally
#  - backend-dev / web-dev: run dev servers locally
#  - logs: follow docker compose logs
#  - health: simple backend health check

.PHONY: help setup deps up down build-images logs backend-dev web-dev health clean smoke

help:
	@echo "Mail TraceX Makefile"
	@echo "  setup        - run ./bin/setup to install node and workspace deps"
	@echo "  up           - docker compose -f docker-compose.local.yml up --build -d"
	@echo "  down         - docker compose -f docker-compose.local.yml down"
	@echo "  build-images - build backend and web docker images locally"
	@echo "  backend-dev  - start backend in dev mode (requires deps)"
	@echo "  web-dev      - start web in dev mode (requires deps)"
	@echo "  logs         - follow docker compose logs"
	@echo "  health       - check backend health endpoint"
	@echo "  smoke        - run simple smoke test against backend and web"

setup:
	@bash ./bin/setup

deps:
	@bash ./bin/setup

install-deps:
	@# Ensure node and npm are present before trying to install dependencies
	@if ! command -v node >/dev/null 2>&1; then \
		echo "node not found. Install Node.js (nvm or Homebrew) and re-run 'make install-deps'" >&2; exit 1; \
	fi
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "npm not found. Ensure npm is installed (usually bundled with Node.js) and re-run 'make install-deps'" >&2; exit 1; \
	fi
	@bash ./bin/setup

local-db-start:
	@echo "Starting local Redis and MongoDB via Homebrew (requires brew)"
	@brew services start redis || true
	@brew tap mongodb/brew || true
	@brew services start mongodb-community@6.0 || true

local-db-stop:
	@echo "Stopping local Redis and MongoDB via Homebrew"
	@brew services stop redis || true
	@brew services stop mongodb-community@6.0 || true

run-local:
	@echo "Run backend and web in separate terminals:"
	@echo "  cd backend && npm run dev"
	@echo "  cd web && npm run dev"

start-local-bg:
	@mkdir -p logs tmp
	@echo "Starting backend in background (logs/backend.log, tmp/backend.pid)"
	@(cd backend && nohup npm run dev > ../logs/backend.log 2>&1 & echo $$! > ../tmp/backend.pid)
	@sleep 1
	@echo "Starting web in background (logs/web.log, tmp/web.pid)"
	@(cd web && nohup npm run dev > ../logs/web.log 2>&1 & echo $$! > ../tmp/web.pid)
	@echo "Started. Use 'make logs' to follow docker logs or tail logs/*.log to follow dev logs."

stop-local-bg:
	@echo "Stopping background processes..."
	@[ -f tmp/backend.pid ] && (kill -TERM $(cat tmp/backend.pid) 2>/dev/null || true) || echo "no backend.pid"
	@[ -f tmp/web.pid ] && (kill -TERM $(cat tmp/web.pid) 2>/dev/null || true) || echo "no web.pid"
	@rm -f tmp/backend.pid tmp/web.pid || true
	@echo "Stopped."

pm2-start:
	@echo "Starting backend + web via PM2 (ecosystem.config.js)"
	@npx pm2 start ecosystem.config.js || true

pm2-stop:
	@echo "Stopping PM2 apps from ecosystem.config.js"
	@npx pm2 stop ecosystem.config.js || true

pm2-status:
	@npx pm2 ls || true

up:
	docker compose -f docker-compose.local.yml up --build -d

down:
	docker compose -f docker-compose.local.yml down

build-images:
	@echo "Building backend image..."
	docker build -t mailtracex-backend:local -f backend/Dockerfile backend
	@echo "Building web image..."
	docker build -t mailtracex-web:local -f web/Dockerfile web

logs:
	docker compose -f docker-compose.local.yml logs -f

backend-dev:
	@cd backend && npm run dev

web-dev:
	@cd web && npm run dev

health:
	@echo "Checking backend at http://localhost:4000/_health"
	@curl -fsS http://localhost:4000/_health || (echo "Backend health check failed" && exit 2)

smoke: health
	@bash ./scripts/smoke.sh

clean:
	@echo "Removing containers and orphan volumes (docker compose down)"
	docker compose -f docker-compose.local.yml down --volumes --remove-orphans || true
