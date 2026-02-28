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
import { SuperAdminRestaurantsService } from '../services/super-admin-restaurants.service';
import { CreateSA_RestaurantDto } from '../dto/create-restaurant.dto';
import { UpdateSA_RestaurantDto } from '../dto/update-restaurant.dto';
import { SearchRestaurantDto } from '../dto/search-restaurant.dto';

@Controller('super-admin/restaurants')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.remove(id);
  }
}
