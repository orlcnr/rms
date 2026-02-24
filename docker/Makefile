# Variables
COMPOSE_BASE = -f docker-compose.yml
COMPOSE_DEV_FILE = -f docker-compose.dev.yml
COMPOSE_PROD_FILE = -f docker-compose.prod.yml
ENV_DEV = --env-file env/.env.dev
ENV_PROD = --env-file env/.env.prod

COMPOSE_DEV = docker compose $(COMPOSE_BASE) $(COMPOSE_DEV_FILE) $(ENV_DEV)
COMPOSE_PROD = docker compose $(COMPOSE_BASE) $(COMPOSE_PROD_FILE) $(ENV_PROD)

.PHONY: dev dev-down dev-restart dev-up-backend dev-up-frontend dev-up-web dev-down-backend dev-down-frontend dev-down-web prod prod-down build-dev build-prod build-backend build-frontend build-web logs-dev logs-prod ps clean certs restart-backend restart-frontend restart-web

# Development Commands
dev:
	@echo "Starting Development Environment..."
	$(COMPOSE_DEV) up -d

dev-down:
	$(COMPOSE_DEV) down

dev-restart:
	@echo "Restarting Development Environment..."
	$(COMPOSE_DEV) restart

# Service-specific commands
dev-up-backend:
	@echo "Starting Backend only..."
	$(COMPOSE_DEV) up -d backend

dev-up-frontend:
	@echo "Starting Frontend only..."
	$(COMPOSE_DEV) up -d frontend

dev-up-web:
	@echo "Starting Web only..."
	$(COMPOSE_DEV) up -d web

dev-down-backend:
	@echo "Stopping Backend..."
	$(COMPOSE_DEV) stop backend

dev-down-frontend:
	@echo "Stopping Frontend..."
	$(COMPOSE_DEV) stop frontend

dev-down-web:
	@echo "Stopping Web..."
	$(COMPOSE_DEV) stop web

build-backend:
	@echo "Building Backend..."
	$(COMPOSE_DEV) build backend

build-frontend:
	@echo "Building Frontend..."
	$(COMPOSE_DEV) build frontend

build-web:
	@echo "Building Web..."
	$(COMPOSE_DEV) build web

restart-backend:
	@echo "Restarting Backend..."
	$(COMPOSE_DEV) restart backend

restart-frontend:
	@echo "Restarting Frontend..."
	$(COMPOSE_DEV) restart frontend

restart-web:
	@echo "Restarting Web..."
	$(COMPOSE_DEV) restart web

build-dev:
	$(COMPOSE_DEV) build

logs-dev:
	$(COMPOSE_DEV) logs -f

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
	docker compose ps

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
