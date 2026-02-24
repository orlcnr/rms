import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  message?: string;
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
      map((data) => ({
        data,
        statusCode: context.switchToHttp().getResponse().statusCode,
        timestamp: new Date().toISOString(),
      })),
    ); // Note: For snake_case keys in JSON response, class-transformer is better suited or a recursive function here.
    // The user asked for "response objeleri olusturalim". This wrapper standardizes the envelope.
    // To enforce snake_case keys in output, we typically use ClassSerializerInterceptor with @Expose and naming strategy.
    // However, that requires annotating every DTO.
    // A recursive key mapper here is a bit heavy but works. For now, assuming standard wrapper.
  }
}
