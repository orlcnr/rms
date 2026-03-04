# Variables
COMPOSE_BASE = -f docker-compose.yml
COMPOSE_DEV_FILE = -f docker-compose.dev.yml
COMPOSE_PROD_FILE = -f docker-compose.prod.yml
ENV_DEV = --env-file env/.env.dev
ENV_PROD = --env-file env/.env.prod

COMPOSE_DEV = docker compose $(COMPOSE_BASE) $(COMPOSE_DEV_FILE) $(ENV_DEV)
COMPOSE_PROD = docker compose $(COMPOSE_BASE) $(COMPOSE_PROD_FILE) $(ENV_PROD)

.PHONY: dev dev-down dev-restart dev-up-backend dev-up-frontend dev-up-web dev-up-admin dev-up-kibana dev-down-backend dev-down-frontend dev-down-web dev-down-admin dev-down-kibana prod prod-down build-dev build-prod build-backend build-frontend build-web build-admin logs-dev logs-prod ps clean certs restart-backend restart-frontend restart-web restart-admin restart-kibana config-dev lint-web build-web-check lint-backend build-backend-check logs-kibana logs-admin

# Development Commands
dev:
	@echo "Starting Development Environment..."
	$(COMPOSE_DEV) up -d --build --force-recreate --remove-orphans

dev-down:
	$(COMPOSE_DEV) down

dev-restart:
	@echo "Restarting Development Environment..."
	$(COMPOSE_DEV) restart

# Service-specific commands
dev-up-backend:
	@echo "Starting Backend only..."
	$(COMPOSE_DEV) up -d --build --force-recreate backend

dev-up-frontend:
	@echo "Starting Frontend only..."
	$(COMPOSE_DEV) up -d --build --force-recreate web

dev-up-web:
	@echo "Starting Web only..."
	$(COMPOSE_DEV) up -d --build --force-recreate web

dev-up-admin:
	@echo "Starting Admin only..."
	$(COMPOSE_DEV) up -d --build --force-recreate admin

dev-up-kibana:
	@echo "Starting Kibana..."
	$(COMPOSE_DEV) up -d kibana

dev-down-backend:
	@echo "Stopping Backend..."
	$(COMPOSE_DEV) stop backend

dev-down-frontend:
	@echo "Stopping Frontend..."
	$(COMPOSE_DEV) stop web

dev-down-web:
	@echo "Stopping Web..."
	$(COMPOSE_DEV) stop web

dev-down-admin:
	@echo "Stopping Admin..."
	$(COMPOSE_DEV) stop admin

dev-down-kibana:
	@echo "Stopping Kibana..."
	$(COMPOSE_DEV) stop kibana

build-backend:
	@echo "Building Backend..."
	$(COMPOSE_DEV) build backend

build-frontend:
	@echo "Building Frontend..."
	$(COMPOSE_DEV) build --no-cache web

build-web:
	@echo "Building Web..."
	$(COMPOSE_DEV) build --no-cache web

build-admin:
	@echo "Building Admin..."
	$(COMPOSE_DEV) build --no-cache admin

restart-backend:
	@echo "Restarting Backend..."
	$(COMPOSE_DEV) restart backend

restart-frontend:
	@echo "Restarting Frontend..."
	$(COMPOSE_DEV) restart web

restart-web:
	@echo "Restarting Web..."
	$(COMPOSE_DEV) restart web

restart-admin:
	@echo "Restarting Admin..."
	$(COMPOSE_DEV) restart admin

restart-kibana:
	@echo "Restarting Kibana..."
	$(COMPOSE_DEV) restart kibana

build-dev:
	$(COMPOSE_DEV) build --no-cache

config-dev:
	$(COMPOSE_DEV) config

lint-web:
	$(COMPOSE_DEV) exec -T web npm run lint

build-web-check:
	$(COMPOSE_DEV) exec -T web npm run build

lint-backend:
	$(COMPOSE_DEV) exec -T backend npm run lint

build-backend-check:
	$(COMPOSE_DEV) exec -T backend npm run build

logs-dev:
	$(COMPOSE_DEV) logs -f

logs-kibana:
	$(COMPOSE_DEV) logs -f kibana

logs-admin:
	$(COMPOSE_DEV) logs -f admin

# Production Simulation Commands
prod: certs
	@echo "Starting Production Simulation..."
	$(COMPOSE_PROD) up -d

prod-down:
	$(COMPOSE_PROD) down

build-prod:
	$(COMPOSE_PROD) build

logs-prod:
	$(COMPOSE_PROD) logs -f

# Utilities
ps:
	$(COMPOSE_DEV) ps

clean:
	docker system prune -f
	docker volume prune -f

certs:
	@if [ ! -f certs/cert.pem ]; then \
		echo "Generating Self-Signed Certificates..."; \
		mkdir -p certs; \
		openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=TR/ST=Istanbul/L=Istanbul/O=RMS/OU=IT/CN=*.rms.com"; \
	fi

help:
	@echo "Usage:"
	@echo "  make dev         - Start development environment"
	@echo "  make dev-restart - Restart development environment"
	@echo "  make prod        - Start production simulation"
	@echo "  make build-prod   - Build production images"
	@echo "  make logs-prod    - View production logs"
	@echo "  make clean       - Cleanup docker system"
