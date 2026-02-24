import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class RestaurantCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;

    const isHttpApp = httpAdapter && !!httpAdapter.getRequestMethod;
    const cacheMetadata = this.reflector.get(
      'cache_metadata',
      context.getHandler(),
    );

    if (!isHttpApp || cacheMetadata) {
      return cacheMetadata;
    }

    const { user } = request;
    const restaurantId = user?.restaurantId || 'global';

    if (!restaurantId) {
      throw new UnauthorizedException(
        'Bir restorana atanmış olmanız gerekmektedir.',
      );
    }
    // Create a unique key using the URL and the restaurantId
    // format: /api/v1/reports/sales/daily?start=...-restaurant-uuid
    return `${httpAdapter.getRequestUrl(request)}-${restaurantId}`;
  }
}
