import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly loggedModules = ['orders', 'inventory', 'menus', 'payments'];

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = request;
    const userAgent = request.headers['user-agent'];

    // Sadece mutasyon işlemlerini (POST, PATCH, DELETE) logla
    const isMutation = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method);
    const moduleName = url.split('/')[3]; // /api/v1/orders/... -> orders

    if (isMutation && this.loggedModules.includes(moduleName)) {
      return next.handle().pipe(
        tap((responseData) => {
          this.auditService.emitLog({
            user_id: user?.id,
            user_name: user?.first_name
              ? `${user.first_name} ${user.last_name || ''}`
              : 'System',
            restaurant_id: user?.restaurantId, // validate metodundan restaurantId geliyor
            action: `${method} ${url}`,
            resource: moduleName?.toUpperCase() || 'UNKNOWN',
            payload: body,
            ip_address: ip,
            user_agent: userAgent,
          });
        }),
      );
    }

    return next.handle();
  }
}
