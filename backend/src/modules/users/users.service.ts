import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { paginate } from 'nestjs-typeorm-paginate';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActivateDeactivateUserDto } from './dto/activate-deactivate-user.dto';
import * as bcrypt from 'bcrypt';

import { RestaurantsService } from '../restaurants/restaurants.service';

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
    private restaurantsService: RestaurantsService,
  ) {}

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
  ): Promise<User> {
    const { email, first_name, last_name, role, restaurant_id } = createUserDto;

    // Validate role if provided
    if (role) {
      // Cannot create super_admin
      if (role === Role.SUPER_ADMIN) {
        throw new BadRequestException('Cannot create super_admin users');
      }

      // Check if requester can create users with this role
      if (!this.canCreateRole(requesterUser.role, role)) {
        throw new ForbiddenException(
          `You do not have permission to create users with role "${role}"`,
        );
      }
    }

    // For non-super-admin requesters, validate restaurant_id
    let userRestaurantId = restaurant_id;
    if (requesterUser.role !== Role.SUPER_ADMIN) {
      userRestaurantId = requesterUser.restaurant_id;
    } else if (!restaurant_id) {
      throw new BadRequestException(
        'Restaurant ID is required for super_admin users',
      );
    }

    // Generate a random password for the user
    const tempPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt();
    const password_hash = await bcrypt.hash(tempPassword, salt);

    const user = this.usersRepository.create({
      email,
      password_hash,
      first_name,
      last_name,
      role: role || Role.CUSTOMER,
      restaurant_id: userRestaurantId,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      // Remove password_hash from response
      const { password_hash: _, ...result } = savedUser;
      return result as User;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          `User with email "${email}" already exists`,
        );
      }
      throw new InternalServerErrorException();
    }
  }

  async findByEmail(
    email: string,
    relations: string[] = [],
  ): Promise<User | null> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.email = :email', { email });

    relations.forEach((relation) => {
      queryBuilder.leftJoinAndSelect(`u.${relation}`, relation);
    });

    return queryBuilder.getOne();
  }

  async findAll(
    requestingUser: User,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      includeDeleted?: boolean;
    } = {},
  ): Promise<PaginatedUsers<User>> {
    const { page = 1, limit = 10, search, includeDeleted = false } = options;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    // Include soft-deleted users if requested (super_admin only)
    if (!includeDeleted) {
      queryBuilder.where('user.deleted_at IS NULL');
    }

    // Filter by restaurant for non-super-admins
    if (requestingUser.role !== Role.SUPER_ADMIN) {
      queryBuilder.andWhere('user.restaurant_id = :restaurantId', {
        restaurantId: requestingUser.restaurant_id,
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
      ({ password_hash: _, ...user }) => user as User,
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
    const { password_hash: _, ...result } = user;
    return result as User;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requesterUser: User,
  ): Promise<User> {
    const user = await this.validateUserAccess(id, requesterUser);

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

    // Update user
    Object.assign(user, updateUserDto);

    const savedUser = await this.usersRepository.save(user);
    const { password_hash: _, ...result } = savedUser;
    return result as User;
  }

  async setActive(
    id: string,
    activateDeactivateDto: ActivateDeactivateUserDto,
    requesterUser: User,
  ): Promise<User> {
    const user = await this.validateUserAccess(id, requesterUser);

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
    const { password_hash: _, ...result } = savedUser;
    return result as User;
  }

  async softDelete(id: string, requesterUser: User): Promise<void> {
    const user = await this.validateUserAccess(id, requesterUser);

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
  }

  async restore(id: string, requesterUser: User): Promise<User> {
    const user = await this.validateUserAccess(id, requesterUser);

    // Only super_admin can restore users
    if (requesterUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can restore users');
    }

    await this.usersRepository.restore(id);

    const restoredUser = await this.findOne(id, requesterUser);
    return restoredUser;
  }

  async assignToRestaurant(
    userId: string,
    restaurantId: string,
    adminUser: User,
  ): Promise<User> {
    const user = await this.findOne(userId, adminUser);
    const restaurant = await this.restaurantsService.findOne(
      restaurantId,
      adminUser,
    );

    user.restaurant_id = restaurant.id;
    return this.usersRepository.save(user);
  }
}
