# Docker & DevOps Rules

## Docker Kurallari

### 1. Container Naming Convention

| Container | Name | Amaç |
|-----------|------|------|
| Frontend | `rms_web` | Next.js app |
| Backend | `rms_backend` | NestJS API |
| PostgreSQL | `rms_postgres` | Database |
| Redis | `rms_redis` | Cache |
| RabbitMQ | `rms_rabbitmq` | Message queue |
| Elasticsearch | `rms_elasticsearch` | Search |
| Mailpit | `rms_mailpit` | Mail testing |

### 2. Dockerfile Best Practices

```dockerfile
# DO - Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["node", "dist/main.js"]

# DO NOT - Single stage with dev dependencies
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "run", "start"]
```

### 3. docker-compose.yml Kurallari

```yaml
# DO - Health check kullan
postgres:
  image: postgres:15-alpine
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 5

# DO - Depends_on ile health check
backend:
  depends_on:
    postgres:
      condition: service_healthy

# DO - Network isolation
networks:
  rms_network:
    driver: bridge
  proxy:
    external: true

# DO - Volume naming
volumes:
  postgres_data:
  redis_data:
```

### 4. Environment Variables

```bash
# .env.dev format
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=rms

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest

# Elasticsearch
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# App
NODE_ENV=development
PORT=3000
```

---

## Traefik Kurallari

### 1. Label Convention

```yaml
labels:
  # Enable Traefik
  - "traefik.enable=true"
  
  # Router configuration
  - "traefik.http.routers.[service]-dev.rule=Host(`[subdomain].localhost`)"
  - "traefik.http.routers.[service]-dev.entrypoints=websecure"
  - "traefik.http.routers.[service]-dev.tls=true"
  
  # Service configuration
  - "traefik.http.services.[service]-dev.loadbalancer.server.port=[port]"
  
  # Network
  - "traefik.docker.network=proxy"
```

### 2. URL Convention

| Service | Development URL | Production URL |
|---------|-----------------|----------------|
| Frontend | `https://app.localhost` | `https://app.domain.com` |
| Backend | `https://api.localhost` | `https://api.domain.com` |
| RabbitMQ | `https://rabbitmq.localhost` | `https://rabbitmq.domain.com` |
| Mailpit | `https://mail.localhost` | N/A |
| Elasticsearch | `https://es.localhost` | Internal only |

---

## Make Komutlari

### Mevcut Komutlar

| Komut | Açiklama |
|-------|----------|
| `make dev` | Development ortamini baslat |
| `make dev-down` | Development ortamini durdur |
| `make build-dev` | Development image'larini build et |
| `make logs-dev` | Development loglarini goster |
| `make prod` | Production ortamini baslat |
| `make prod-down` | Production ortamini durdur |
| `make build-prod` | Production image'larini build et |
| `make logs-prod` | Production loglarini goster |
| `make ps` | Container durumunu goster |
| `make clean` | Temizlik islemleri |
| `make certs` | SSL sertifikalari olustur |
| `make start` | Alias for dev |
| `make stop` | Alias for dev-down |
| `make restart` | Development ortamini yeniden baslat |

### Yeni Komut Ekleme

```makefile
# Makefile
.PHONY: new-command

new-command:
	$(MAKE) -C docker new-command
```

```makefile
# docker/Makefile
.PHONY: new-command

new-command:
	@echo "Running new command..."
	docker compose -f docker-compose.yml -f docker-compose.dev.yml [action]
```

---

## Deployment Kurallari

### 1. Development Deployment

```bash
# Ilk kurulum
docker network create proxy
make certs
make dev

# Günlük kullanim
make dev          # Baslat
make logs-dev     # Loglari goster
make dev-down     # Durdur
```

### 2. Production Deployment

```bash
# Build ve baslat
make build-prod
make prod

# Monitoring
make logs-prod
make ps
```

### 3. Zero-Downtime Deployment

```yaml
# docker-compose.prod.yml
backend:
  deploy:
    replicas: 2
    update_config:
      parallelism: 1
      delay: 10s
      failure_action: rollback
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Monitoring & Logging

### 1. Log Tipleri

| Log Tipi | Açiklama |
|----------|----------|
| Application | Backend/Frontend loglari |
| Access | HTTP request loglari |
| Error | Hata loglari |
| Audit | Kullanici islem loglari |

### 2. Log Format

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "context": "OrdersService",
  "message": "Order created",
  "data": {
    "orderId": "uuid",
    "restaurantId": "uuid"
  }
}
```

### 3. Health Check Endpoints

| Service | Endpoint | Response |
|---------|----------|----------|
| Backend | `/health` | `{ "status": "ok" }` |
| Frontend | `/api/health` | `{ "status": "ok" }` |

---

## Security Kurallari

### 1. Container Security

```yaml
# DO - Non-root user
backend:
  user: "node:node"
  
# DO - Read-only filesystem
backend:
  read_only: true
  tmpfs:
    - /tmp
    
# DO - Resource limits
backend:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
```

### 2. Network Security

```yaml
# DO - Internal network for sensitive services
networks:
  internal:
    internal: true  # No external access
    
# Services that don't need external access
postgres:
  networks:
    - internal
    - rms_network
```

### 3. Secrets Management

```yaml
# DO NOT - Hardcoded secrets
environment:
  - DB_PASSWORD=secret123

# DO - Docker secrets
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  postgres:
    secrets:
      - db_password
```

---

## Backup & Recovery

### 1. Database Backup

```bash
# Backup olustur
docker exec rms_postgres pg_dump -U postgres rms > backup_$(date +%Y%m%d).sql

# Backup geri yükle
cat backup.sql | docker exec -i rms_postgres psql -U postgres rms
```

### 2. Volume Backup

```bash
# Volume backup
docker run --rm -v rms_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# Volume restore
docker run --rm -v rms_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

---

## Troubleshooting

### 1. Yaygin Sorunlar

| Sorun | Neden | Çözüm |
|-------|-------|-------|
| Container baslamiyor | Health check fail | Loglari kontrol et |
| Network hatasi | Yanlis network | `docker network ls` |
| Volume hatasi | Permission issue | Volume sahibini kontrol et |
| SSL hatasi | Sertifika yok | `make certs` |

### 2. Debug Komutlari

```bash
# Container durumu
docker ps -a

# Container loglari
docker logs rms_backend
docker logs -f rms_backend  # Follow mode

# Container içine giris
docker exec -it rms_backend sh

# Network kontrol
docker network inspect proxy

# Volume kontrol
docker volume ls

# Resource kullanimi
docker stats

# Temizlik
docker system prune -a  # Dikkat: tüm kullanilmayan kaynaklari siler
```

---

## CI/CD Integration

### 1. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build & Deploy
        run: |
          make build-prod
          make prod
```

### 2. Deployment Checklist

- [ ] Tests pass
- [ ] Build successful
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Health checks pass
- [ ] SSL certificates valid
- [ ] Monitoring active