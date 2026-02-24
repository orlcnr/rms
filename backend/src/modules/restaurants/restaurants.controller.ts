import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Restaurants')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Create a new restaurant' })
  @ApiResponse({ status: 201, description: 'Restaurant created successfully.' })
  create(
    @Body() createRestaurantDto: CreateRestaurantDto,
    @GetUser() user: User,
  ) {
    return this.restaurantsService.create(createRestaurantDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all restaurants (Admin) or your restaurant' })
  findAll(@GetUser() user: User) {
    return this.restaurantsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a restaurant by ID' })
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.restaurantsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Update a restaurant' })
  update(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
    @GetUser() user: User,
  ) {
    return this.restaurantsService.update(id, updateRestaurantDto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_OWNER)
  @ApiOperation({ summary: 'Delete a restaurant' })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.restaurantsService.remove(id, user);
  }
}
