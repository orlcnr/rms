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
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { UpsertBranchMenuOverrideDto } from './dto/upsert-branch-menu-override.dto';

@ApiTags('Menus')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTAURANT_OWNER,
    Role.MANAGER,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
  )
  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    const data = await this.menusService.createCategory(createCategoryDto);
    return ApiResponseDto.ok(data);
  }

  @Public()
  @Get('restaurants/:restaurantId/categories')
  @ApiOperation({ summary: 'Get all categories for a restaurant' })
  async findAllCategories(@Param('restaurantId') restaurantId: string) {
    const data =
      await this.menusService.findAllCategoriesByRestaurant(restaurantId);
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTAURANT_OWNER,
    Role.MANAGER,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
  )
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const data = await this.menusService.updateCategory(id, updateCategoryDto);
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.BRAND_OWNER, Role.BRANCH_MANAGER)
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category' })
  async deleteCategory(@Param('id') id: string) {
    await this.menusService.deleteCategory(id);
    return ApiResponseDto.empty('Kategori silindi');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTAURANT_OWNER,
    Role.MANAGER,
    Role.WAITER,
    Role.CHEF,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
    Role.BRANCH_WAITER,
    Role.BRANCH_CHEF,
  )
  @Get('restaurants/:restaurantId/items')
  @ApiOperation({ summary: 'Get all menu items for a restaurant (Paginated)' })
  async findAllMenuItems(
    @Param('restaurantId') restaurantId: string,
    @Query() queryDto: GetMenuItemsDto,
  ) {
    const result = await this.menusService.findAllMenuItemsByRestaurant(
      restaurantId,
      queryDto,
    );
    return ApiResponseDto.paginated(result.items, result.meta);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTAURANT_OWNER,
    Role.MANAGER,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
  )
  @Post('items')
  @ApiOperation({ summary: 'Create a new menu item' })
  async createMenuItem(@Body() createMenuItemDto: CreateMenuItemDto) {
    const data = await this.menusService.createMenuItem(createMenuItemDto);
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTAURANT_OWNER,
    Role.MANAGER,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
  )
  @Get('items/:id')
  @ApiOperation({ summary: 'Get a menu item by ID' })
  async findMenuItemById(@Param('id') id: string) {
    const data = await this.menusService.findMenuItemById(id);
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTAURANT_OWNER,
    Role.MANAGER,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
  )
  @Patch('items/:id')
  @ApiOperation({ summary: 'Update a menu item' })
  async updateMenuItem(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    const data = await this.menusService.updateMenuItem(id, updateMenuItemDto);
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.BRAND_OWNER, Role.BRANCH_MANAGER)
  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete a menu item' })
  async deleteMenuItem(@Param('id') id: string) {
    await this.menusService.deleteMenuItem(id);
    return ApiResponseDto.empty('Ürün silindi');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.BRAND_OWNER, Role.BRANCH_MANAGER)
  @Patch('branches/:branchId/items/:menuItemId/override')
  @ApiOperation({
    summary: 'Hide branch item or set custom price for an effective menu item',
  })
  async upsertBranchMenuOverride(
    @Param('branchId') branchId: string,
    @Param('menuItemId') menuItemId: string,
    @Body() dto: UpsertBranchMenuOverrideDto,
  ) {
    const data = await this.menusService.upsertBranchMenuOverride(
      branchId,
      menuItemId,
      dto,
    );
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.BRAND_OWNER, Role.BRANCH_MANAGER)
  @Delete('branches/:branchId/items/:menuItemId/override')
  @ApiOperation({ summary: 'Remove branch menu override' })
  async deleteBranchMenuOverride(
    @Param('branchId') branchId: string,
    @Param('menuItemId') menuItemId: string,
  ) {
    await this.menusService.deleteBranchMenuOverride(branchId, menuItemId);
    return ApiResponseDto.empty('Şube menü override silindi');
  }
}
