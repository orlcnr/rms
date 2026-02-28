import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Param,
  UseGuards,
  Get,
  Query,
  Put,
  Patch,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActivateDeactivateUserDto } from './dto/activate-deactivate-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
  })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to create users with this role.',
  })
  create(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
    @GetUser() user: User,
  ) {
    return this.usersService.create(createUserDto, user);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({
    summary: 'Get all users (filtered by restaurant if not super admin)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  findAll(
    @GetUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    return this.usersService.findAll(user, {
      page,
      limit,
      search,
      includeDeleted,
    });
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.usersService.findOne(id, user);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to update user with this role.',
  })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
    @GetUser() user: User,
  ) {
    return this.usersService.update(id, updateUserDto, user);
  }

  @Patch(':id/active')
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully activated/deactivated.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to deactivate this user.',
  })
  setActive(
    @Param('id') id: string,
    @Body(ValidationPipe) activateDeactivateDto: ActivateDeactivateUserDto,
    @GetUser() user: User,
  ) {
    return this.usersService.setActive(id, activateDeactivateDto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete a user (super_admin only)' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 403, description: 'Not allowed to delete this user.' })
  softDelete(@Param('id') id: string, @GetUser() user: User) {
    return this.usersService.softDelete(id, user);
  }

  @Post(':id/restore')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted user (super_admin only)' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully restored.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({
    status: 403,
    description: 'Only super_admin can restore users.',
  })
  restore(@Param('id') id: string, @GetUser() user: User) {
    return this.usersService.restore(id, user);
  }

  @Post(':id/assign-restaurant')
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Assign a user to a restaurant' })
  @ApiResponse({
    status: 200,
    description: 'User has been assigned to the restaurant.',
  })
  @ApiResponse({ status: 404, description: 'User or Restaurant not found.' })
  assignToRestaurant(
    @Param('id') id: string,
    @Body('restaurant_id') restaurantId: string,
    @GetUser() user: User,
  ) {
    return this.usersService.assignToRestaurant(id, restaurantId, user);
  }
}
