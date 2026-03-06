import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';

type AuditRequestUser = {
  id?: string;
  first_name?: string;
  last_name?: string;
  restaurantId?: string;
  restaurant_id?: string;
};

type AuditRequest = Request & {
  __auditLogged?: boolean;
  user?: AuditRequestUser;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly loggedModules = ['orders', 'inventory', 'menus', 'payments'];

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const { method, url, user, ip } = request;
    const body: unknown = request.body;
    const headerUserAgent = request.headers['user-agent'];
    const userAgent =
      typeof headerUserAgent === 'string'
        ? headerUserAgent
        : headerUserAgent?.[0];

    // Sadece mutasyon işlemlerini (POST, PATCH, DELETE) logla
    const isMutation = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method);
    const moduleName = url.split('/')[3] || ''; // /api/v1/orders/... -> orders
    const isAlreadyAudited = Boolean(request.__auditLogged);

    if (isAlreadyAudited) {
      return next.handle();
    }

    if (isMutation && moduleName && this.loggedModules.includes(moduleName)) {
      return next.handle().pipe(
        tap((responseData) => {
          void responseData;
          if (request.__auditLogged) {
            return;
          }

          const userName = user?.first_name
            ? `${user.first_name} ${user.last_name || ''}`.trim()
            : 'System';

          void this.auditService.safeEmitLog(
            {
              user_id: user?.id,
              user_name: userName,
              restaurant_id: user?.restaurantId || user?.restaurant_id,
              action: `${method} ${url}`,
              resource: moduleName.toUpperCase(),
              payload: body,
              ip_address: ip,
              user_agent: userAgent,
            },
            'AuditInterceptor',
          );
        }),
      );
    }

    return next.handle();
  }
}
