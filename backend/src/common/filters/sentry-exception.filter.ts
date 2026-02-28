import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';

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

      if (status >= 400 && status < 500) {
        return response.status(status).json({
          success: false,
          statusCode: status,
          message,
          timestamp: new Date().toISOString(),
        });
      }
    }

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
      `[${status}] ${request.method} ${request.url} — SentryId: ${sentryEventId}`,
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
