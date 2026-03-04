USER_ID := $(shell id -u)
GROUP_ID := $(shell id -g)

.PHONY: dev dev-down dev-up-backend dev-up-frontend dev-up-admin dev-up-kibana dev-down-backend dev-down-frontend dev-down-admin dev-down-kibana prod prod-down build-dev build-prod build-backend build-frontend build-admin build-web logs-dev logs-prod ps clean certs start stop restart restart-backend restart-frontend restart-admin restart-kibana dev-web dev-admin dev-backend dev-web-down dev-admin-down dev-backend-down dev-web-logs dev-admin-logs dev-backend-logs install install-web install-admin install-backend rebuild-web rebuild-admin rebuild-backend clean-web-next clean-admin-next clean-artifacts fix-artifacts-perms lint-web-check build-web-check lint-backend-check build-backend-check logs-kibana logs-admin

# Docker-based development
dev:
	$(MAKE) -C docker dev

dev-down:
	$(MAKE) -C docker dev-down

dev-up-backend:
	$(MAKE) -C docker dev-up-backend

dev-up-frontend:
	$(MAKE) -C docker dev-up-frontend

dev-up-admin:
	$(MAKE) -C docker dev-up-admin

dev-up-kibana:
	$(MAKE) -C docker dev-up-kibana

dev-down-backend:
	$(MAKE) -C docker dev-down-backend

dev-down-frontend:
	$(MAKE) -C docker dev-down-frontend

dev-down-admin:
	$(MAKE) -C docker dev-down-admin

dev-down-kibana:
	$(MAKE) -C docker dev-down-kibana

build-dev:
	$(MAKE) -C docker build-dev

build-backend:
	$(MAKE) -C docker build-backend

build-frontend:
	$(MAKE) -C docker build-frontend

build-admin:
	$(MAKE) -C docker build-admin

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
	cd apps/admin && npm install

install-web:
	cd web && npm install

install-admin:
	cd apps/admin && npm install

install-backend:
	cd backend && npm install

# Frontend (Next.js on port 3003)
dev-web:
	cd web && npm run dev

dev-web-down:
	@echo "Stopping web dev server (port 3003)..."
	-@fuser -k 3003/tcp 2>/dev/null || true
	@echo "Done"

dev-web-logs:
	@echo "Web dev server logs - use terminal output above"

# Admin (Next.js on port 3004)
dev-admin:
	cd apps/admin && npm run dev

dev-admin-down:
	@echo "Stopping admin dev server (port 3004)..."
	-@fuser -k 3004/tcp 2>/dev/null || true
	@echo "Done"

dev-admin-logs:
	@echo "Admin dev server logs - use terminal output above"

build-web:
	$(MAKE) -C docker build-web

clean-admin-next:
	cd apps/admin && rm -rf .next

clean-web-next:
	cd web && rm -rf .next

clean-artifacts:
	rm -rf web/.next apps/admin/.next backend/dist

fix-artifacts-perms:
	@if [ -e web/.next ] || [ -e apps/admin/.next ] || [ -e backend/dist ]; then \
		sudo chown -R $(USER_ID):$(GROUP_ID) web/.next apps/admin/.next backend/dist 2>/dev/null || chown -R $(USER_ID):$(GROUP_ID) web/.next apps/admin/.next backend/dist 2>/dev/null || true; \
	fi

lint-web-check:
	$(MAKE) -C docker lint-web

build-web-check:
	$(MAKE) -C docker build-web-check

lint-backend-check:
	$(MAKE) -C docker lint-backend

build-backend-check:
	$(MAKE) -C docker build-backend-check

rebuild-web:
	$(MAKE) -C docker build-web
	$(MAKE) -C docker dev-down-web
	$(MAKE) -C docker dev-up-web

rebuild-admin:
	$(MAKE) -C docker build-admin
	$(MAKE) -C docker dev-down-admin
	$(MAKE) -C docker dev-up-admin

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

restart-admin:
	$(MAKE) -C docker restart-admin

restart-kibana:
	$(MAKE) -C docker restart-kibana

logs-kibana:
	$(MAKE) -C docker logs-kibana

logs-admin:
	$(MAKE) -C docker logs-admin
