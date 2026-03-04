import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  statusCode: number;
  message?: string;
  meta?: unknown;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data
        ) {
          return {
            statusCode: context.switchToHttp().getResponse().statusCode,
            timestamp: new Date().toISOString(),
            ...(data as Record<string, unknown>),
          } as Response<T>;
        }

        return {
          success: true,
          data,
          statusCode: context.switchToHttp().getResponse().statusCode,
          timestamp: new Date().toISOString(),
        };
      }),
    ); // Note: For snake_case keys in JSON response, class-transformer is better suited or a recursive function here.
    // The user asked for "response objeleri olusturalim". This wrapper standardizes the envelope.
    // To enforce snake_case keys in output, we typically use ClassSerializerInterceptor with @Expose and naming strategy.
    // However, that requires annotating every DTO.
    // A recursive key mapper here is a bit heavy but works. For now, assuming standard wrapper.
  }
}
