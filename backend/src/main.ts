import './instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { RedisIoAdapter } from './common/adapters/redis-io.adaptor';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { SentryRabbitMQInterceptor } from './common/interceptors/sentry-rabbitmq.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // Redis Adapter Entegrasyonu
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // RabbitMQ Audit Microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
      ],
      queue:
        configService.get<string>('RABBITMQ_AUDIT_QUEUE') || 'audit_logs_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // RabbitMQ Popularity Microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
      ],
      queue:
        configService.get<string>('RABBITMQ_POPULARITY_QUEUE') ||
        'popularity_update_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // RabbitMQ Mail Microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
      ],
      queue: configService.get<string>('RABBITMQ_MAIL_QUEUE') || 'mail_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  // Get CORS origins from environment variable
  const corsOriginsEnv = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((origin) => origin.trim())
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const isDev = configService.get<string>('NODE_ENV') === 'development';
      const isLocalhost =
        origin === 'https://localhost' ||
        origin === 'http://localhost' ||
        origin.endsWith('.localhost');

      // Check if origin is in allowed list or is a localhost/subdomain in dev
      if (allowedOrigins.includes(origin) || (isDev && isLocalhost)) {
        callback(null, true);
      } else {
        console.error(`CORS Error: Origin ${origin} not allowed`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
  });
  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Pipes & Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        logger.error('Validation errors:', errors);
        return new BadRequestException(errors);
      },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalInterceptors(new SentryRabbitMQInterceptor());
  app.useGlobalFilters(new SentryExceptionFilter());

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Restaurant Management System')
    .setDescription('API documentation for the Restaurant Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
