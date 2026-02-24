import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { GetMenuItemsDto } from './dto/get-menu-items.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Menus')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.menusService.createCategory(createCategoryDto);
  }

  @Public()
  @Get('restaurants/:restaurantId/categories')
  @ApiOperation({ summary: 'Get all categories for a restaurant' })
  findAllCategories(@Param('restaurantId') restaurantId: string) {
    return this.menusService.findAllCategoriesByRestaurant(restaurantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.menusService.updateCategory(id, updateCategoryDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category' })
  deleteCategory(@Param('id') id: string) {
    return this.menusService.deleteCategory(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER, Role.WAITER, Role.CHEF)
  @Get('restaurants/:restaurantId/items')
  @ApiOperation({ summary: 'Get all menu items for a restaurant (Paginated)' })
  findAllMenuItems(
    @Param('restaurantId') restaurantId: string,
    @Query() queryDto: GetMenuItemsDto,
  ) {
    return this.menusService.findAllMenuItemsByRestaurant(
      restaurantId,
      queryDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @Post('items')
  @ApiOperation({ summary: 'Create a new menu item' })
  createMenuItem(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menusService.createMenuItem(createMenuItemDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @Get('items/:id')
  @ApiOperation({ summary: 'Get a menu item by ID' })
  findMenuItemById(@Param('id') id: string) {
    return this.menusService.findMenuItemById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.MANAGER)
  @Patch('items/:id')
  @ApiOperation({ summary: 'Update a menu item' })
  updateMenuItem(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menusService.updateMenuItem(id, updateMenuItemDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete a menu item' })
  deleteMenuItem(@Param('id') id: string) {
    return this.menusService.deleteMenuItem(id);
  }
}
