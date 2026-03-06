import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { paginate } from 'nestjs-typeorm-paginate';
import { User } from './entities/user.entity';
import { UserBranchRole } from './entities/user-branch-role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActivateDeactivateUserDto } from './dto/activate-deactivate-user.dto';
import * as bcrypt from 'bcrypt';

import { RestaurantsService } from '../restaurants/restaurants.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/enums/audit-action.enum';
import { sanitizeAuditChanges } from '../audit/utils/sanitize-audit.util';

interface PaginationMeta {
  itemCount?: number;
  totalItems?: number;
  itemsPerPage?: number;
  totalPages?: number;
  currentPage?: number;
}

export type PaginatedUsers<T> = {
  items: T[];
  meta: PaginationMeta;
};

// Role hierarchy (higher number = higher privilege)
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.BRAND_OWNER]: 90,
  [Role.BRANCH_MANAGER]: 70,
  [Role.BRANCH_CASHIER]: 50,
  [Role.BRANCH_WAITER]: 45,
  [Role.BRANCH_CHEF]: 35,
  [Role.RESTAURANT_OWNER]: 80,
  [Role.MANAGER]: 60,
  [Role.WAITER]: 40,
  [Role.CHEF]: 30,
  [Role.CUSTOMER]: 10,
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserBranchRole)
    private userBranchRoleRepository: Repository<UserBranchRole>,
    private restaurantsService: RestaurantsService,
    private auditService: AuditService,
  ) {}

  private buildActorName(user?: User): string | undefined {
    if (!user?.first_name) {
      return undefined;
    }
    return `${user.first_name} ${user.last_name || ''}`.trim();
  }

  private getScopedContext(user: User): User & {
    brandId?: string | null;
    branchId?: string | null;
    restaurantId?: string | null;
  } {
    return user as User & {
      brandId?: string | null;
      branchId?: string | null;
      restaurantId?: string | null;
    };
  }

  private async getActorBrandId(user: User): Promise<string | null> {
    const brandIdFromToken = this.getScopedContext(user).brandId || null;
    if (brandIdFromToken) {
      return brandIdFromToken;
    }

    if (!user.restaurant_id) {
      return null;
    }

    try {
      const ownRestaurant = await this.restaurantsService.findOne(
        user.restaurant_id,
        user,
      );
      return ownRestaurant.brand_id || null;
    } catch {
      return null;
    }
  }

  private getActorBranchId(user: User): string | null {
    const scoped = this.getScopedContext(user);
    return (
      scoped.branchId || scoped.restaurant_id || scoped.restaurantId || null
    );
  }

  private async assertCanManageTargetBranch(
    user: User,
    target: { id: string; brand_id?: string | null },
  ): Promise<void> {
    if (user.role === Role.SUPER_ADMIN) {
      return;
    }

    if (user.role === Role.BRAND_OWNER || user.role === Role.RESTAURANT_OWNER) {
      const actorBrandId = await this.getActorBrandId(user);
      if (actorBrandId && target.brand_id === actorBrandId) {
        return;
      }
      throw new ForbiddenException(
        'You can only manage users for branches in your brand',
      );
    }

    if (user.role === Role.BRANCH_MANAGER) {
      const actorBranchId = this.getActorBranchId(user);
      if (actorBranchId && actorBranchId === target.id) {
        return;
      }
      throw new ForbiddenException(
        'Branch manager can only manage users in own branch',
      );
    }

    if (user.role === Role.MANAGER) {
      if (user.restaurant_id === target.id) {
        return;
      }
      throw new ForbiddenException(
        'You can only manage users in your restaurant',
      );
    }

    throw new ForbiddenException(
      'You do not have permission for this branch operation',
    );
  }

  private async createWithResolvedRestaurantId(
    createUserDto: CreateUserDto,
    requesterUser: User,
    resolvedRestaurantId: string,
    request?: Request,
    targetBranchId?: string,
  ): Promise<User> {
    const { email, first_name, last_name, role, phone } = createUserDto;

    if (role) {
      if (role === Role.SUPER_ADMIN) {
        throw new BadRequestException('Cannot create super_admin users');
      }

      if (!this.canCreateRole(requesterUser.role, role)) {
        throw new ForbiddenException(
          `You do not have permission to create users with role "${role}"`,
        );
      }
    }

    const providedPassword =
      typeof createUserDto.password === 'string'
        ? createUserDto.password.trim()
        : '';
    const tempPassword =
      providedPassword || Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt();
    const password_hash = await bcrypt.hash(tempPassword, salt);

    const user = this.usersRepository.create({
      email,
      password_hash,
      first_name,
      last_name,
      phone,
      role: role || Role.CUSTOMER,
      restaurant_id: resolvedRestaurantId,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      const { password_hash: passwordHash, ...result } = savedUser;
      void passwordHash;

      await this.auditService.safeEmitLog(
        {
          action: AuditAction.USER_CREATED,
          resource: 'USERS',
          user_id: requesterUser.id,
          user_name: this.buildActorName(requesterUser),
          restaurant_id: savedUser.restaurant_id || requesterUser.restaurant_id,
          payload: {
            targetUserId: savedUser.id,
            ...(targetBranchId ? { targetBranchId } : {}),
          },
          changes: sanitizeAuditChanges({
            after: {
              id: savedUser.id,
              email: savedUser.email,
              first_name: savedUser.first_name,
              last_name: savedUser.last_name,
              phone: savedUser.phone,
              role: savedUser.role,
              restaurant_id: savedUser.restaurant_id,
              is_active: savedUser.is_active,
            },
          }),
          ip_address: request?.ip,
          user_agent: request?.headers['user-agent'],
        },
        'UsersService.createWithResolvedRestaurantId',
      );
      this.auditService.markRequestAsAudited(
        request as unknown as Record<string, unknown>,
      );

      return result as User;
    } catch (error) {
      const errorCode =
        error &&
        typeof error === 'object' &&
        'code' in error &&
        typeof (error as { code?: unknown }).code === 'string'
          ? (error as { code: string }).code
          : undefined;

      if (errorCode === '23505') {
        throw new ConflictException(
          `User with email "${email}" already exists`,
        );
      }
      throw new InternalServerErrorException();
    }
  }

  async getScopedRoles(
    userId: string,
    brandId?: string | null,
    branchId?: string | null,
  ): Promise<Role[]> {
    const query = this.userBranchRoleRepository
      .createQueryBuilder('ubr')
      .select('ubr.role', 'role')
      .where('ubr.user_id = :userId', { userId });

    if (brandId) {
      query.andWhere('ubr.brand_id = :brandId', { brandId });
    }

    if (branchId) {
      query.andWhere('(ubr.branch_id = :branchId OR ubr.branch_id IS NULL)', {
        branchId,
      });
    }

    const roles = await query.getRawMany<{ role: Role }>();
    return roles.map((row) => row.role);
  }

  /**
   * Check if the requester can create users with the specified role
   */
  private canCreateRole(requesterRole: Role, targetRole: Role): boolean {
    // Super admin can create any role except super_admin
    if (requesterRole === Role.SUPER_ADMIN) {
      return targetRole !== Role.SUPER_ADMIN;
    }
    // Restaurant owner can create any role below their level
    if (requesterRole === Role.RESTAURANT_OWNER) {
      return ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY[requesterRole];
    }
    // Manager can create waiter, chef, customer
    if (requesterRole === Role.MANAGER) {
      return [Role.WAITER, Role.CHEF, Role.CUSTOMER].includes(targetRole);
    }
    if (requesterRole === Role.BRAND_OWNER) {
      return (
        ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY[requesterRole] &&
        targetRole !== Role.SUPER_ADMIN
      );
    }
    if (requesterRole === Role.BRANCH_MANAGER) {
      return [
        Role.BRANCH_CASHIER,
        Role.BRANCH_WAITER,
        Role.BRANCH_CHEF,
        Role.CUSTOMER,
      ].includes(targetRole);
    }
    // Others cannot create users
    return false;
  }

  /**
   * Check if the requester can update a user to the specified role
   */
  private canUpdateRole(requesterRole: Role, targetRole: Role): boolean {
    // Super admin can update any role except super_admin
    if (requesterRole === Role.SUPER_ADMIN) {
      return targetRole !== Role.SUPER_ADMIN;
    }
    // Restaurant owner can update to any role below their level
    if (requesterRole === Role.RESTAURANT_OWNER) {
      return ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY[requesterRole];
    }
    // Manager can update to waiter, chef, customer
    if (requesterRole === Role.MANAGER) {
      return [Role.WAITER, Role.CHEF, Role.CUSTOMER].includes(targetRole);
    }
    if (requesterRole === Role.BRAND_OWNER) {
      return (
        ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY[requesterRole] &&
        targetRole !== Role.SUPER_ADMIN
      );
    }
    if (requesterRole === Role.BRANCH_MANAGER) {
      return [
        Role.BRANCH_CASHIER,
        Role.BRANCH_WAITER,
        Role.BRANCH_CHEF,
        Role.CUSTOMER,
      ].includes(targetRole);
    }
    return false;
  }

  /**
   * Validate that user belongs to the same restaurant as the requester
   */
  private async validateUserAccess(
    targetUserId: string,
    requesterUser: User,
  ): Promise<User> {
    const targetUser = await this.findOne(targetUserId);

    // Super admin can access any user
    if (requesterUser.role === Role.SUPER_ADMIN) {
      return targetUser;
    }

    // Others must be in the same restaurant
    if (targetUser.restaurant_id !== requesterUser.restaurant_id) {
      throw new ForbiddenException('You do not have access to this user');
    }

    return targetUser;
  }

  async create(
    createUserDto: CreateUserDto,
    requesterUser: User,
    request?: Request,
  ): Promise<User> {
    const { restaurant_id } = createUserDto;

    let resolvedRestaurantId = restaurant_id;
    if (requesterUser.role !== Role.SUPER_ADMIN) {
      resolvedRestaurantId = requesterUser.restaurant_id;
    } else if (!resolvedRestaurantId) {
      throw new BadRequestException(
        'Restaurant ID is required for super_admin users',
      );
    }

    return this.createWithResolvedRestaurantId(
      createUserDto,
      requesterUser,
      resolvedRestaurantId,
      request,
    );
  }

  async createForBranch(
    branchId: string,
    createUserDto: CreateUserDto,
    requesterUser: User,
    request?: Request,
  ): Promise<User> {
    const branch = await this.restaurantsService.findOne(
      branchId,
      requesterUser,
    );
    await this.assertCanManageTargetBranch(requesterUser, {
      id: branch.id,
      brand_id: branch.brand_id,
    });

    return this.createWithResolvedRestaurantId(
      {
        ...createUserDto,
        restaurant_id: undefined,
      },
      requesterUser,
      branch.id,
      request,
      branch.id,
    );
  }

  async findByEmail(
    email: string,
    relations: string[] = [],
  ): Promise<User | null> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.email = :email', { email });

    const joinedAliases = new Set<string>();

    relations.forEach((relationPath) => {
      const parts = relationPath.split('.');
      let parentAlias = 'u';
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        const joinAlias = currentPath.replace(/\./g, '_');

        if (!joinedAliases.has(joinAlias)) {
          const joinSource =
            index === 0 ? `u.${part}` : `${parentAlias}.${part}`;
          queryBuilder.leftJoinAndSelect(joinSource, joinAlias);
          joinedAliases.add(joinAlias);
        }

        parentAlias = joinAlias;
      });
    });

    return queryBuilder.getOne();
  }

  async findAll(
    requestingUser: User,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      branchId?: string;
      includeDeleted?: boolean;
    } = {},
  ): Promise<PaginatedUsers<User>> {
    const {
      page = 1,
      limit = 10,
      search,
      branchId,
      includeDeleted = false,
    } = options;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Include soft-deleted users if requested (super_admin only)
    if (!includeDeleted) {
      queryBuilder.where('user.deleted_at IS NULL');
    }

    if (requestingUser.role === Role.SUPER_ADMIN) {
      if (branchId) {
        queryBuilder.andWhere('user.restaurant_id = :branchId', { branchId });
      }
    } else if (
      requestingUser.role === Role.BRAND_OWNER ||
      requestingUser.role === Role.RESTAURANT_OWNER
    ) {
      const branches = await this.restaurantsService.findAll(requestingUser);
      const branchIds = branches.map((branch) => branch.id);

      if (!branchIds.length) {
        queryBuilder.andWhere('1 = 0');
      } else if (branchId) {
        if (!branchIds.includes(branchId)) {
          throw new ForbiddenException(
            'You do not have access to this branch users',
          );
        }
        queryBuilder.andWhere('user.restaurant_id = :branchId', { branchId });
      } else {
        queryBuilder.andWhere('user.restaurant_id IN (:...branchIds)', {
          branchIds,
        });
      }
    } else {
      queryBuilder.andWhere('user.restaurant_id = :restaurantId', {
        restaurantId: this.getActorBranchId(requestingUser),
      });
    }

    // Search by name or email
    if (search) {
      queryBuilder.andWhere(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('user.created_at', 'DESC');

    const result = await paginate<User>(queryBuilder, { page, limit });
    // Remove password_hash from items
    const sanitizedItems = result.items.map(
      ({ password_hash: passwordHash, ...user }) => {
        void passwordHash;
        return user as User;
      },
    );
    return {
      items: sanitizedItems,
      meta: result.meta,
    };
  }

  async findOne(id: string, requestingUser?: User): Promise<User> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id })
      .withDeleted();

    const user = await queryBuilder.getOne();

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Data isolation: Non-admins can only see users in their own restaurant
    if (
      requestingUser &&
      requestingUser.role !== Role.SUPER_ADMIN &&
      user.restaurant_id !== requestingUser.restaurant_id
    ) {
      throw new ForbiddenException('You do not have access to this user');
    }

    // Remove password_hash from response
    const { password_hash: passwordHash, ...result } = user;
    void passwordHash;
    return result as User;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requesterUser: User,
    request?: Request,
  ): Promise<User> {
    const user = await this.validateUserAccess(id, requesterUser);
    const beforeSnapshot = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role,
      restaurant_id: user.restaurant_id,
      is_active: user.is_active,
    };

    // Check if trying to update to owner role (only super_admin can do this)
    if (
      updateUserDto.role === Role.RESTAURANT_OWNER &&
      requesterUser.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only super_admin can assign restaurant_owner role',
      );
    }

    // Validate role update permissions
    if (updateUserDto.role && updateUserDto.role !== user.role) {
      if (!this.canUpdateRole(requesterUser.role, updateUserDto.role)) {
        throw new ForbiddenException(
          `You do not have permission to update users to role "${updateUserDto.role}"`,
        );
      }
    }

    // Prevent demoting yourself if you're the only owner
    if (
      user.id === requesterUser.id &&
      user.role === Role.RESTAURANT_OWNER &&
      updateUserDto.role &&
      updateUserDto.role !== Role.RESTAURANT_OWNER
    ) {
      // Check if there are other owners in the restaurant
      const otherOwners = await this.usersRepository.count({
        where: {
          restaurant_id: user.restaurant_id,
          role: Role.RESTAURANT_OWNER,
          id: Not(user.id),
        },
      });

      if (otherOwners === 0) {
        throw new BadRequestException(
          'Cannot demote the only restaurant owner',
        );
      }
    }

    const { password, ...safeUpdates } = updateUserDto;

    // Update user fields (except password)
    Object.assign(user, safeUpdates);

    // Ignore empty password, update hash only when a non-empty value is provided
    if (typeof password === 'string' && password.trim().length > 0) {
      const salt = await bcrypt.genSalt();
      user.password_hash = await bcrypt.hash(password.trim(), salt);
    }

    const savedUser = await this.usersRepository.save(user);
    const { password_hash: passwordHash, ...result } = savedUser;
    void passwordHash;

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.USER_UPDATED,
        resource: 'USERS',
        user_id: requesterUser.id,
        user_name: this.buildActorName(requesterUser),
        restaurant_id: savedUser.restaurant_id || requesterUser.restaurant_id,
        payload: {
          targetUserId: savedUser.id,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            id: savedUser.id,
            email: savedUser.email,
            first_name: savedUser.first_name,
            last_name: savedUser.last_name,
            phone: savedUser.phone,
            role: savedUser.role,
            restaurant_id: savedUser.restaurant_id,
            is_active: savedUser.is_active,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'UsersService.update',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return result as User;
  }

  async setActive(
    id: string,
    activateDeactivateDto: ActivateDeactivateUserDto,
    requesterUser: User,
    request?: Request,
  ): Promise<User> {
    const user = await this.validateUserAccess(id, requesterUser);
    const beforeSnapshot = {
      id: user.id,
      is_active: user.is_active,
      role: user.role,
      restaurant_id: user.restaurant_id,
    };

    // Prevent deactivating yourself
    if (user.id === requesterUser.id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    // Prevent deactivating owner if no other owners exist
    if (
      !activateDeactivateDto.is_active &&
      user.role === Role.RESTAURANT_OWNER
    ) {
      const otherOwners = await this.usersRepository.count({
        where: {
          restaurant_id: user.restaurant_id,
          role: Role.RESTAURANT_OWNER,
          id: Not(user.id),
          is_active: true,
        },
      });

      if (otherOwners === 0) {
        throw new BadRequestException(
          'Cannot deactivate the only restaurant owner',
        );
      }
    }

    // Prevent deactivating super_admin (only super_admin can do this, and only other super_admins)
    if (!activateDeactivateDto.is_active && user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot deactivate super_admin users');
    }

    user.is_active = activateDeactivateDto.is_active;

    const savedUser = await this.usersRepository.save(user);
    const { password_hash: passwordHash, ...result } = savedUser;
    void passwordHash;

    await this.auditService.safeEmitLog(
      {
        action: AuditAction.USER_STATUS_CHANGED,
        resource: 'USERS',
        user_id: requesterUser.id,
        user_name: this.buildActorName(requesterUser),
        restaurant_id: savedUser.restaurant_id || requesterUser.restaurant_id,
        payload: {
          targetUserId: savedUser.id,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            id: savedUser.id,
            is_active: savedUser.is_active,
            role: savedUser.role,
            restaurant_id: savedUser.restaurant_id,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'UsersService.setActive',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return result as User;
  }

  async softDelete(
    id: string,
    requesterUser: User,
    request?: Request,
  ): Promise<void> {
    const user = await this.validateUserAccess(id, requesterUser);
    const beforeSnapshot = {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      restaurant_id: user.restaurant_id,
    };

    // Cannot soft delete owner
    if (user.role === Role.RESTAURANT_OWNER) {
      throw new ForbiddenException(
        'Cannot delete restaurant_owner users. Transfer ownership first.',
      );
    }

    // Cannot soft delete yourself
    if (user.id === requesterUser.id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Cannot soft delete super_admin (only super_admin can delete, and only other super_admins)
    if (user.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete super_admin users');
    }

    // Super admin can only be deleted by other super admins
    if (requesterUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can delete users');
    }

    await this.usersRepository.softDelete(id);
    await this.auditService.safeEmitLog(
      {
        action: AuditAction.USER_DELETED,
        resource: 'USERS',
        user_id: requesterUser.id,
        user_name: this.buildActorName(requesterUser),
        restaurant_id: user.restaurant_id || requesterUser.restaurant_id,
        payload: {
          targetUserId: user.id,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: { deleted: true },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'UsersService.softDelete',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );
  }

  async restore(
    id: string,
    requesterUser: User,
    request?: Request,
  ): Promise<User> {
    const targetUser = await this.validateUserAccess(id, requesterUser);

    // Only super_admin can restore users
    if (requesterUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can restore users');
    }

    await this.usersRepository.restore(id);

    const restoredUser = await this.findOne(id, requesterUser);
    await this.auditService.safeEmitLog(
      {
        action: AuditAction.USER_RESTORED,
        resource: 'USERS',
        user_id: requesterUser.id,
        user_name: this.buildActorName(requesterUser),
        restaurant_id:
          restoredUser.restaurant_id || requesterUser.restaurant_id,
        payload: {
          targetUserId: restoredUser.id,
        },
        changes: sanitizeAuditChanges({
          before: {
            id: targetUser.id,
            deleted: true,
          },
          after: {
            id: restoredUser.id,
            deleted: false,
            is_active: restoredUser.is_active,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'UsersService.restore',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );
    return restoredUser;
  }

  async assignToRestaurant(
    userId: string,
    restaurantId: string,
    adminUser: User,
    request?: Request,
  ): Promise<User> {
    const user = await this.findOne(userId, adminUser);
    const beforeSnapshot = {
      id: user.id,
      restaurant_id: user.restaurant_id,
      token_version: user.token_version,
    };
    const restaurant = await this.restaurantsService.findOne(
      restaurantId,
      adminUser,
    );
    await this.assertCanManageTargetBranch(adminUser, {
      id: restaurant.id,
      brand_id: restaurant.brand_id,
    });

    user.restaurant_id = restaurant.id;
    user.token_version = Number(user.token_version || 1) + 1;
    const savedUser = await this.usersRepository.save(user);
    await this.auditService.safeEmitLog(
      {
        action: AuditAction.USER_ASSIGNED_RESTAURANT,
        resource: 'USERS',
        user_id: adminUser.id,
        user_name: this.buildActorName(adminUser),
        restaurant_id: savedUser.restaurant_id || adminUser.restaurant_id,
        payload: {
          targetUserId: savedUser.id,
          assignedRestaurantId: restaurant.id,
        },
        changes: sanitizeAuditChanges({
          before: beforeSnapshot,
          after: {
            id: savedUser.id,
            restaurant_id: savedUser.restaurant_id,
            token_version: savedUser.token_version,
          },
        }),
        ip_address: request?.ip,
        user_agent: request?.headers['user-agent'],
      },
      'UsersService.assignToRestaurant',
    );
    this.auditService.markRequestAsAudited(
      request as unknown as Record<string, unknown>,
    );

    return savedUser;
  }
}
