import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '../enums/role.enum'
import { AuditService } from '../../modules/audit/audit.service'

@Injectable()
export class SuperAdminGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private auditService: AuditService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const user = request.user

        if (!user) {
            throw new ForbiddenException('Authentication required')
        }

        console.log(`[SuperAdminGuard] User: ${user.email}, Role: ${user.role}, RestaurantId: ${user.restaurantId}`)

        // 1. Role kontrolü - SUPER_ADMIN olmalı
        if (user.role !== Role.SUPER_ADMIN) {
            console.log(`[SuperAdminGuard] Access Denied: Role ${user.role} is not ${Role.SUPER_ADMIN}`)
            await this.auditService.emitLog({
                action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
                resource: 'super-admin',
                user_id: user.id,
                payload: { ip: request.ip, path: request.path }
            })
            throw new ForbiddenException('Super admin access required')
        }

        // 2. Restaurant ID kontrolü - SUPER_ADMIN'de null olmalı
        const restaurantId = user.restaurantId // Correct from JwtStrategy
        if (restaurantId !== null && restaurantId !== undefined) {
            console.log(`[SuperAdminGuard] Access Denied: Super Admin cannot be tied to a restaurant (${restaurantId})`)
            await this.auditService.emitLog({
                action: 'INVALID_SUPER_ADMIN_ACCOUNT',
                resource: 'super-admin',
                user_id: user.id,
                payload: { restaurant_id: restaurantId }
            })
            throw new ForbiddenException('Invalid super admin account')
        }

        // 3. IP Whitelist kontrolü (opsiyonel)
        const allowedIPs = process.env.SUPER_ADMIN_ALLOWED_IPS?.split(',').map(ip => ip.trim())
        if (allowedIPs && allowedIPs.length > 0 && !allowedIPs.includes(request.ip)) {
            await this.auditService.emitLog({
                action: 'IP_NOT_WHITELISTED',
                resource: 'super-admin',
                user_id: user.id,
                payload: { ip: request.ip, allowed_ips: allowedIPs }
            })
            throw new ForbiddenException('Access denied from this IP address')
        }

        return true
    }
}
