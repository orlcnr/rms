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
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { SuperAdminRestaurantsService } from '../services/super-admin-restaurants.service';
import { CreateSA_RestaurantDto } from '../dto/create-restaurant.dto';
import { UpdateSA_RestaurantDto } from '../dto/update-restaurant.dto';
import { SearchRestaurantDto } from '../dto/search-restaurant.dto';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdminJwtAuthGuard } from '../../super-admin-auth/guards/super-admin-jwt-auth.guard';

@ApiTags('Super Admin Restaurants')
@ApiBearerAuth()
@Controller('super-admin/restaurants')
@UseGuards(SuperAdminJwtAuthGuard, SuperAdminGuard)
@UseInterceptors(AuditInterceptor)
@Throttle({ default: { limit: 50, ttl: 60000 } }) // 60 saniyede 50 istek
export class SuperAdminRestaurantsController {
  constructor(
    private readonly restaurantsService: SuperAdminRestaurantsService,
  ) {}

  @Get()
  findAll(@Query() queryDto: SearchRestaurantDto) {
    return this.restaurantsService.findAll(queryDto);
  }

  @Get('stats')
  getStats() {
    return this.restaurantsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Kritik işlem - daha sıkı limit
  create(@Body() createRestaurantDto: CreateSA_RestaurantDto) {
    return this.restaurantsService.create(createRestaurantDto);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRestaurantDto: UpdateSA_RestaurantDto,
  ) {
    return this.restaurantsService.update(id, updateRestaurantDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deprecated: use suspend instead',
    deprecated: true,
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Deprecation', 'true');
    return this.restaurantsService.remove(id);
  }

  @Patch(':id/suspend')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.suspend(id);
  }

  @Patch(':id/activate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.activate(id);
  }
}
