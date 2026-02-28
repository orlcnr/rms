import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryRabbitMQInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryRabbitMQInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handlerName = context.getHandler().name;
    const className = context.getClass().name;

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
            `RabbitMQ error in ${className}.${handlerName}: ${error.message} — SentryId: ${sentryEventId}`,
            error.stack,
          );
        },
      }),
      catchError((error) => throwError(() => error)),
    );
  }
}
