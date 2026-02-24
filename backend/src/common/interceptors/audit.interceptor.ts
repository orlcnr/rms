import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { AuditService } from '../../modules/audit/audit.service'

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const { user, method, url, body, ip } = request
        const startTime = Date.now()

        // Extract entity info from URL
        const entityType = this.extractEntityType(url)
        const entityId = this.extractEntityId(url)

        return next.handle().pipe(
            tap(async (response) => {
                await this.auditService.emitLog({
                    action: `${method} ${url}`,
                    resource: entityType,
                    user_id: user?.id,
                    payload: this.sanitizeBody(body)
                })
            }),
            catchError(async (error) => {
                await this.auditService.emitLog({
                    action: `${method} ${url} - ERROR`,
                    resource: entityType,
                    user_id: user?.id,
                    payload: { body: this.sanitizeBody(body), error: error.message }
                })
                throw error
            })
        )
    }

    private extractEntityType(url: string): string {
        const match = url.match(/\/super-admin\/([^\/]+)/)
        return match ? match[1] : 'unknown'
    }

    private extractEntityId(url: string): string | null {
        const match = url.match(/\/([a-f0-9-]{36})/)
        return match ? match[1] : null
    }

    private sanitizeBody(body: any): any {
        if (!body) return null

        const sanitized = { ...body }
        // Hassas bilgileri gizle
        if (sanitized.password) sanitized.password = '***'
        if (sanitized.password_hash) sanitized.password_hash = '***'
        if (sanitized.token) sanitized.token = '***'
        return sanitized
    }
}
