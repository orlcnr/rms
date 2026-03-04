import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SuperAdminRefreshAuthGuard extends AuthGuard('super-admin-refresh') {}
