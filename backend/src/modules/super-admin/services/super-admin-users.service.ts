import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreateSuperAdminUserDto } from '../dto/create-super-admin-user.dto';
import { UpdateSuperAdminUserDto } from '../dto/update-super-admin-user.dto';
import { UpdateUserPasswordDto } from '../dto/update-user-password.dto';
import { PasswordService } from '../../../common/services/password.service';
import { MailService } from '../../mail/mail.service';
import { Role } from '../../../common/enums/role.enum';
import { SearchUserDto } from '../dto/search-user.dto';

@Injectable()
export class SuperAdminUsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private passwordService: PasswordService,
    private mailService: MailService,
  ) {}

  async findAll(queryDto: SearchUserDto) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      restaurant_id,
      is_active,
    } = queryDto;
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.restaurant', 'restaurant')
      .orderBy('user.created_at', 'DESC');

    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (restaurant_id) {
      queryBuilder.andWhere('user.restaurant_id = :restaurant_id', {
        restaurant_id,
      });
    }

    if (is_active !== undefined) {
      queryBuilder.andWhere('user.is_active = :is_active', { is_active });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.restaurant', 'restaurant')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(createUserDto: CreateSuperAdminUserDto) {
    // Check if email already exists
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: createUserDto.email })
      .getOne();

    if (existingUser) {
      throw new ConflictException(
        `User with email '${createUserDto.email}' already exists`,
      );
    }

    // Validate role and restaurant_id combination
    if (
      createUserDto.role === Role.SUPER_ADMIN &&
      createUserDto.restaurant_id
    ) {
      throw new ConflictException(
        'SUPER_ADMIN cannot be assigned to a restaurant',
      );
    }

    if (
      createUserDto.role !== Role.SUPER_ADMIN &&
      !createUserDto.restaurant_id
    ) {
      throw new ConflictException(
        'Non-SUPER_ADMIN users must be assigned to a restaurant',
      );
    }

    // Generate or use provided password
    const password =
      createUserDto.password || this.passwordService.generateSecurePassword();
    const password_hash = await this.passwordService.hashPassword(password);

    const user = this.userRepository.create({
      email: createUserDto.email,
      first_name: createUserDto.first_name,
      last_name: createUserDto.last_name,
      password_hash,
      role: createUserDto.role,
      restaurant_id: createUserDto.restaurant_id || undefined,
      is_active: true,
    });

    const savedUser = await this.userRepository.save(user);

    // TODO: Send email with credentials
    // await this.emailService.sendWelcomeEmail(user.email, password)

    return {
      ...savedUser,
      temporary_password: createUserDto.password ? undefined : password, // Return only if auto-generated
    };
  }

  async update(id: string, updateUserDto: UpdateSuperAdminUserDto) {
    const user = await this.findOne(id);

    // Check email uniqueness if changing
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email: updateUserDto.email })
        .andWhere('user.id != :id', { id })
        .getOne();

      if (existingUser) {
        throw new ConflictException(
          `User with email '${updateUserDto.email}' already exists`,
        );
      }
    }

    // Validate role and restaurant_id combination
    const newRole = updateUserDto.role || user.role;
    const newRestaurantId =
      updateUserDto.restaurant_id !== undefined
        ? updateUserDto.restaurant_id
        : user.restaurant_id;

    if (newRole === Role.SUPER_ADMIN && newRestaurantId) {
      throw new ConflictException(
        'SUPER_ADMIN cannot be assigned to a restaurant',
      );
    }

    if (newRole !== Role.SUPER_ADMIN && !newRestaurantId) {
      throw new ConflictException(
        'Non-SUPER_ADMIN users must be assigned to a restaurant',
      );
    }

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto['password_hash'] = await this.passwordService.hashPassword(
        updateUserDto.password,
      );
      delete updateUserDto.password;
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async updatePassword(id: string, dto: UpdateUserPasswordDto) {
    const user = await this.findOne(id);

    const password =
      dto.password || this.passwordService.generateSecurePassword();
    user.password_hash = await this.passwordService.hashPassword(password);

    await this.userRepository.save(user);

    // Send email
    await this.mailService.sendPasswordUpdateEmail(
      user.email,
      user.first_name,
      password,
    );

    return {
      message: 'Password updated successfully',
      new_password: dto.password ? undefined : password,
    };
  }

  async remove(id: string) {
    const user = await this.findOne(id);

    // Soft delete - just deactivate
    user.is_active = false;
    await this.userRepository.save(user);

    return { message: 'User deactivated successfully' };
  }

  async getStats() {
    const total = await this.userRepository.count();
    const active = await this.userRepository
      .createQueryBuilder('user')
      .where('user.is_active = :active', { active: true })
      .getCount();

    const byRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      byRole: byRole.reduce((acc, { role, count }) => {
        acc[role] = parseInt(count);
        return acc;
      }, {}),
    };
  }
}
