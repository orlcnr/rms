import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { SuperAdminUsersService } from '../services/super-admin-users.service';
import { CreateSuperAdminUserDto } from '../dto/create-super-admin-user.dto';
import { UpdateSuperAdminUserDto } from '../dto/update-super-admin-user.dto';
import { UpdateUserPasswordDto } from '../dto/update-user-password.dto';
import { SearchUserDto } from '../dto/search-user.dto';

@Controller('super-admin/users')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@UseInterceptors(AuditInterceptor)
@Throttle({ default: { limit: 50, ttl: 60000 } })
export class SuperAdminUsersController {
  constructor(private readonly usersService: SuperAdminUsersService) {}

  @Get()
  findAll(@Query() queryDto: SearchUserDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get('stats')
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Body() createUserDto: CreateSuperAdminUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateSuperAdminUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePasswordDto: UpdateUserPasswordDto,
  ) {
    return this.usersService.updatePassword(id, updatePasswordDto);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
