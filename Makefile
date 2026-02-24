.PHONY: dev dev-down dev-up-backend dev-up-frontend dev-down-backend dev-down-frontend prod prod-down build-dev build-prod build-backend build-frontend build-web logs-dev logs-prod ps clean certs start stop restart restart-backend restart-frontend dev-web dev-backend dev-web-down dev-backend-down dev-web-logs dev-backend-logs install install-web install-backend rebuild-web rebuild-backend

# Docker-based development
dev:
	$(MAKE) -C docker dev

dev-down:
	$(MAKE) -C docker dev-down

dev-up-backend:
	$(MAKE) -C docker dev-up-backend

dev-up-frontend:
	$(MAKE) -C docker dev-up-frontend

dev-down-backend:
	$(MAKE) -C docker dev-down-backend

dev-down-frontend:
	$(MAKE) -C docker dev-down-frontend

build-dev:
	$(MAKE) -C docker build-dev

build-backend:
	$(MAKE) -C docker build-backend

build-frontend:
	$(MAKE) -C docker build-frontend

logs-dev:
	$(MAKE) -C docker logs-dev

prod:
	$(MAKE) -C docker prod

prod-down:
	$(MAKE) -C docker prod-down

build-prod:
	$(MAKE) -C docker build-prod

logs-prod:
	$(MAKE) -C docker logs-prod

ps:
	$(MAKE) -C docker ps

clean:
	$(MAKE) -C docker clean

certs:
	$(MAKE) -C docker certs

# Local development (without Docker)
# Install dependencies
install:
	cd backend && npm install
	cd web && npm install

install-web:
	cd web && npm install

install-backend:
	cd backend && npm install

# Frontend (Next.js on port 3003)
dev-web:
	cd web && npm run dev

dev-web-down:
	@echo "Stopping web dev server (port 3003)..."
	-@sudo fuser -k 3003/tcp 2>/dev/null || true
	@echo "Done"

dev-web-logs:
	@echo "Web dev server logs - use terminal output above"

build-web:
	cd web && npm run build

rebuild-web:
	$(MAKE) -C docker build-web
	$(MAKE) -C docker dev-down-web
	$(MAKE) -C docker dev-up-web

rebuild-backend:
	$(MAKE) -C docker build-backend
	$(MAKE) -C docker dev-down-backend
	$(MAKE) -C docker dev-up-backend

# Backend (NestJS on port 3000)
dev-backend:
	cd backend && npm run start:dev

dev-backend-down:
	@echo "Stopping backend dev server..."
	-@sudo fuser -k 3000/tcp 2>/dev/null || true
	@echo "Done"

dev-backend-logs:
	@echo "Backend dev server logs - use terminal output above"

# Aliases for Convenience
start: dev
stop: dev-down
restart:
	$(MAKE) -C docker dev-restart

restart-backend:
	$(MAKE) -C docker restart-backend

restart-frontend:
	$(MAKE) -C docker restart-frontend
