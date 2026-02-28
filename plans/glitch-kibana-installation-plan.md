# GlitchTip + Kibana Kurulum Planı

**NOT**: Bu plan iki aşamalı uygulanacaktır:
- **Aşama 1**: GlitchTip (önce) - Exception takibi, düşük risk
- **Aşama 2**: Kibana (sonra) - Log takibi, mevcut logger değişecek

---

## AŞAMA 1: GlitchTip (Exception Takibi) ✅ ÖNCELİKLİ

### 1.1 Docker Compose - GlitchTip Servisleri

`docker/docker-compose.dev.yml` dosyasına eklenecek:

```yaml
glitchtip:
  image: glitchtip/glitchtip:latest
  container_name: rms_glitchtip
  env_file:
    - ./env/.env.glitchtip
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  networks:
    - rms_network
    - proxy
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.glitchtip.rule=Host(`glitchtip.localhost`)"
    - "traefik.http.routers.glitchtip.entrypoints=web"
    - "traefik.http.services.glitchtip.loadbalancer.server.port=8000"
    - "traefik.docker.network=proxy"
  volumes:
    - glitchtip_data:/code/uploads
  restart: unless-stopped

glitchtip_worker:
  image: glitchtip/glitchtip:latest
  container_name: rms_glitchtip_worker
  command: ./bin/run-celery-with-beat.sh
  env_file:
    - ./env/.env.glitchtip
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  networks:
    - rms_network
  restart: unless-stopped
```

Volumes bölümüne:
```yaml
volumes:
  glitchtip_data:
```

### 1.2 Environment Dosyası

`docker/env/.env.glitchtip` oluşturulacak:

```bash
# Database — mevcut postgres kullanılıyor
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/glitchtip

# Redis — mevcut redis, farklı db index
REDIS_URL=redis://redis:6379/1

# Güvenlik — production'da değiştir
SECRET_KEY=dev-secret-key-change-in-production

# Email — mevcut mailpit
EMAIL_URL=smtp://mailpit:1025
DEFAULT_FROM_EMAIL=glitchtip@localhost

# Uygulama
GLITCHTIP_DOMAIN=http://glitchtip.localhost
ALLOWED_HOSTS=glitchtip.localhost,localhost
ENABLE_OPEN_USER_REGISTRATION=False

# Performans (development)
CELERY_WORKER_CONCURRENCY=2
```

### 1.3 İlk Kurulum

```bash
# 1. Servisleri başlat
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d glitchtip glitchtip_worker

# 2. Database migration (ilk seferde)
docker exec rms_glitchtip ./manage.py migrate

# 3. Admin kullanıcı oluştur
docker exec -it rms_glitchtip ./manage.py createsuperuser
# Email: admin@localhost
# Password: (istediğin şifre)

# 4. Erişim
# http://glitchtip.localhost
```

### 1.4 GlitchTip'te Proje Oluşturma

1. `http://glitchtip.localhost` → Giriş yap
2. **Organizations** → **Create Organization** → "Restaurant Management System"
3. **Projects** → **Create Project**
   - Backend: Platform = **Django** (NestJS yok, Django seç - SDK uyumlu)
   - Frontend: Platform = **Next.js**
4. DSN değerlerini kopyala

---

### 1.5 Backend - NestJS Entegrasyonu

#### ⚠️ ÖNEMLİ: instrument.ts Import Sırası

`backend/src/instrument.ts` dosyası `main.ts`'te **herhangi bir NestJS modülünden ÖNCE** import edilmeli. Bu kritik!

#### Paket Kurulumu
```bash
cd backend
npm install @sentry/nestjs @sentry/profiling-node
```

#### instrument.ts
`backend/src/instrument.ts` oluştur:

```typescript
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const sentryDsn = process.env.SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [nodeProfilingIntegration()],

    // KVKK uyumu - hassas veri temizleme
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request?.data) {
        const sensitiveFields = ['password', 'card_number', 'cvv', 'tip_amount', 'token', 'secret'];
        sensitiveFields.forEach((field) => {
          if (event.request?.data?.[field]) {
            event.request.data[field] = '[FILTERED]';
          }
        });
      }
      return event;
    },
  });
}
```

#### main.ts Güncellemesi ⚠️ KRİTİK
`backend/src/main.ts` dosyasının **en üstüne**, hatta dosyanın **ilk satırı** olarak ekle:

```typescript
// ❌ YANLIŞ - Bu şekilde DEĞİL
// import { NestFactory } from '@nestjs/core';
// import './instrument';  // <-- Bu konum yanlış

// ✅ DOĞRU - instrument DOSYANIN İLK SATIRI OLMALI
import './instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// ... diğer import'lar
```

Ve global filter/interceptor ekle (NestFactory.create'den sonra):

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter
  app.useGlobalFilters(new SentryExceptionFilter());

  // Global RabbitMQ interceptor
  app.useGlobalInterceptors(new SentryRabbitMQInterceptor());

  // ... mevcut kodlar
}
```

#### GlobalExceptionFilter
`backend/src/common/filters/sentry-exception.filter.ts`:

```typescript
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Beklenmeyen bir hata oluştu';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' ? (res as any).message : res;

      // 4xx → GlitchTip'e gönderme
      if (status >= 400 && status < 500) {
        return response.status(status).json({
          success: false,
          statusCode: status,
          message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 5xx ve non-HTTP hatalar → GlitchTip'e gönder
    const sentryEventId = Sentry.captureException(exception, {
      extra: {
        url: request.url,
        method: request.method,
        body: request.body,
        query: request.query,
      },
      tags: {
        source: 'http',
        method: request.method,
      },
    });

    this.logger.error(
      `[${status}] ${request.method} ${request.url} — GlitchTipId: ${sentryEventId}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV !== 'production' && { sentryEventId }),
    });
  }
}
```

#### RabbitMQ Interceptor ⚠️
`backend/src/common/interceptors/sentry-rabbitmq.interceptor.ts`:

```typescript
import {
  Injectable, NestInterceptor,
  ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class SentryRabbitMQInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryRabbitMQInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handlerName = context.getHandler().name;
    const className = context.getClass().name;

    // ⚠️ NOT: HTTP context'i yok, doğrudan RabbitMQ mesajını al
    // host.switchToHttp() çağrılmıyor - sorun yok
    const rabbitData = context.getArgByIndex(0);

    return next.handle().pipe(
      tap({
        error: (error) => {
          const sentryEventId = Sentry.captureException(error, {
            extra: {
              handler: `${className}.${handlerName}`,
              payload: rabbitData,
            },
            tags: {
              source: 'rabbitmq',
              handler: handlerName,
              queue: className,
            },
          });

          this.logger.error(
            `RabbitMQ error in ${className}.${handlerName}: ${error.message} — GlitchTipId: ${sentryEventId}`,
            error.stack,
          );
        },
      }),
      catchError((error) => throwError(() => error)),
    );
  }
}
```

#### Environment Değişkenleri

`docker/docker-compose.dev.yml` backend bölümüne:
```yaml
backend:
  environment:
    SENTRY_DSN: ${SENTRY_DSN:-}
    SENTRY_ENVIRONMENT: ${SENTRY_ENVIRONMENT:-development}
```

`docker/env/.env.dev` dosyasına:
```bash
# GlitchTip - Backend DSN
# ⚠️ NOT: Development'da HTTP, Production'da HTTPS kullan
# Development: http://<key>@glitchtip.localhost/<project_id>
# Production:  https://<key>@sentry.yourdomain.com/<project_id>
SENTRY_DSN=http://<key>@glitchtip.localhost/<project_id>
SENTRY_ENVIRONMENT=development
```

---

### 1.6 Frontend - Next.js Entegrasyonu

#### Paket Kurulumu
```bash
cd web
npm install @sentry/nextjs
```

#### sentry.client.config.ts
`web/sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  });
}
```

#### sentry.server.config.ts
`web/sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
```

#### sentry.edge.config.ts
`web/sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
```

#### global-error.tsx
`web/app/global-error.tsx`:

```typescript
'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center">
          <div>
            <h2>Beklenmeyen bir hata oluştu.</h2>
            <button onClick={() => reset()}>Tekrar Dene</button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

#### next.config.mjs Güncellemesi
`web/next.config.mjs`:

```javascript
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  // ... mevcut config
};

export default withSentryConfig(nextConfig, {
  silent: process.env.NODE_ENV !== 'production',
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
});
```

#### Environment

`docker/docker-compose.dev.yml` web bölümüne:
```yaml
web:
  environment:
    NEXT_PUBLIC_SENTRY_DSN: ${NEXT_PUBLIC_SENTRY_DSN:-}
    SENTRY_DSN: ${SENTRY_DSN_WEB:-}
    SENTRY_ENVIRONMENT: ${SENTRY_ENVIRONMENT:-development}
```

`docker/env/.env.dev` dosyasına:
```bash
# GlitchTip - Frontend DSN
# ⚠️ NOT: Development'da HTTP, Production'da HTTPS kullan
NEXT_PUBLIC_SENTRY_DSN=http://<key>@glitchtip.localhost/<project_id>
SENTRY_DSN_WEB=http://<key>@glitchtip.localhost/<project_id>
```

---

### 1.7 Test Endpoint (Backend)

`backend/src/modules/debug/debug.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';

@Module({
  controllers: [DebugController],
})
export class DebugModule {}
```

`backend/src/modules/debug/debug.controller.ts`:
```typescript
import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Debug')
@Controller('debug')
export class DebugController {
  @Get('sentry-test')
  @ApiOperation({ summary: 'GlitchTip test - sadece development' })
  @ApiResponse({ status: 500, description: 'Test hatası' })
  async sentryTest() {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Development only');
    }
    throw new Error('🧪 GlitchTip Test Hatası');
  }
}
```

**AppModule'e ekle** (app.module.ts):
```typescript
import { Module } from '@nestjs/common';
import { DebugModule } from './modules/debug/debug.module';

@Module({
  imports: [
    // ... mevcut modüller
    DebugModule,
  ],
})
export class AppModule {}
```

---

### 1.8 Aşama 1 Kontrol Listesi

- [ ] GlitchTip container'ları çalışıyor
- [ ] http://glitchtip.localhost erişilebilir
- [ ] Admin kullanıcı oluşturuldu
- [ ] Backend projesi oluşturuldu (Django platform)
- [ ] Frontend projesi oluşturuldu (Next.js platform)
- [ ] Backend SENTRY_DSN ayarlandı
- [ ] Frontend SENTRY_DSN ayarlandı
- [ ] /debug/sentry-test çağrıldı → GlitchTip'te göründü
- [ ] 4xx hatalar GlitchTip'e düşmüyor
- [ ] RabbitMQ hatası `source:rabbitmq` tag'iyle görünüyor

---

## AŞAMA 2: Kibana (Log Takibi) ⚠️ OPSİYONEL

**Aşama 1 tamamlandıktan sonra yapılacak.**

### Neden Dikkatli Yapılmalı?

- Mevcut `new Logger()` yapısını değiştiriyor
- Winston transport ekleniyor
- Elasticsearch bağlantısı gerekiyor

### 2.1 Docker Compose - Kibana

⚠️ **ÖNEMLİ**: Kibana versiyonu Elasticsearch versiyonuyla **tam eşleşmeli**.
- Elasticsearch: `8.11.0` ✓ (mevcut)
- Kibana: `8.11.0` ✓ (aşağıda)

`docker/docker-compose.dev.yml`'de zaten Elasticsearch var. Sadece Kibana ekle:

```yaml
kibana:
  image: kibana:8.11.0
  container_name: rms_kibana
  environment:
    ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    SERVER_NAME: kibana.localhost
    XPACK_SECURITY_ENABLED: "false"
    XPACK_TELEMETRY_ENABLED: "false"
  depends_on:
    - elasticsearch
  networks:
    - rms_network
    - proxy
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.kibana.rule=Host(`kibana.localhost`)"
    - "traefik.http.routers.kibana.entrypoints=web"
    - "traefik.http.services.kibana.loadbalancer.server.port=5601"
    - "traefik.docker.network=proxy"
  restart: unless-stopped
```

### 2.2 Winston + Elasticsearch Kurulumu

#### Paketler
```bash
cd backend
npm install winston nest-winston winston-elasticsearch
```

#### winston.config.ts
`backend/src/common/logger/winston.config.ts`:

```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransportOpts = {
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  },
  index: 'rms-logs',
  transformer: (logData: any) => ({
    '@timestamp': new Date().toISOString(),
    severity: logData.level,
    message: logData.message,
    service: 'rms-backend',
    environment: process.env.NODE_ENV || 'development',
    ...logData.meta,
  }),
};

export const winstonConfig = WinstonModule.createLogger({
  transports: [
    // Console — development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          return `${timestamp} [${context}] ${level}: ${message}`;
        }),
      ),
    }),

    // Elasticsearch
    ...(process.env.ELASTICSEARCH_URL
      ? [new ElasticsearchTransport(esTransportOpts)]
      : []),
  ],
});
```

#### main.ts Güncellemesi
```typescript
import { winstonConfig } from './common/logger/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
  });
  // ...
}
```

### 2.3 Kibana Index Pattern

1. `http://kibana.localhost` aç
2. **Stack Management** → **Index Patterns** → **Create Index Pattern**
3. Pattern: `rms-logs-*`
4. Time field: `@timestamp`
5. **Discover** → logları görüntüle

### 2.4 Aşama 2 Kontrol Listesi

- [ ] Kibana çalışıyor
- [ ] http://kibana.localhost erişilebilir
- [ ] rms-logs-* index pattern oluşturuldu
- [ ] Loglar Discover'da görünüyor
- [ ] severity:error filtresi çalışıyor

---

## Özet

| Aşama | Bileşen | Risk | Sıra |
|-------|---------|------|------|
| 1 | GlitchTip | Düşük | Önce |
| 2 | Kibana + Winston | Orta | Sonra |

---

## ⚠️ Önemli Notlar

### DSN Formatı
| Ortam | Protocol | Örnek |
|-------|----------|-------|
| Development | HTTP | `http://<key>@glitchtip.localhost/<id>` |
| Production | HTTPS | `https://<key>@sentry.yourdomain.com/<id>` |

### Import Sırası
`main.ts`'te `import './instrument'` **her zaman en üstte** olmalı. İlk çalıştırmada test et.

### Kibana Versiyonu
Mevcut Elasticsearch `8.11.0`. Kibana da `8.11.0` olarak ayarlandı. Major versiyon farkı bağlantı sorununa yol açar.

---

## Referanslar

- GlitchTip: https://glitchtip.com/
- Sentry SDK: https://docs.sentry.io/platforms/node/guides/nestjs/
- Winston Elasticsearch: https://www.npmjs.com/package/winston-elasticsearch
