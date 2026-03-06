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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
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
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { GetBranchCategoriesDto } from './dto/get-branch-categories.dto';
import { UpdateBranchCategoriesBulkDto } from './dto/update-branch-categories-bulk.dto';
import { GetBranchMenuItemsDto } from './dto/get-branch-menu-items.dto';
import { BulkBranchMenuOverridesDto } from './dto/bulk-branch-menu-overrides.dto';

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
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.createCategory(
      createCategoryDto,
      user,
      request,
    );
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
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.updateCategory(
      id,
      updateCategoryDto,
      user,
      request,
    );
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.BRAND_OWNER, Role.BRANCH_MANAGER)
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category' })
  async deleteCategory(
    @Param('id') id: string,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    await this.menusService.deleteCategory(id, user, request);
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
    Role.BRANCH_CASHIER,
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
  async createMenuItem(
    @Body() createMenuItemDto: CreateMenuItemDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.createMenuItem(
      createMenuItemDto,
      user,
      request,
    );
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
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.updateMenuItem(
      id,
      updateMenuItemDto,
      user,
      request,
    );
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.BRAND_OWNER, Role.BRANCH_MANAGER)
  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete a menu item' })
  async deleteMenuItem(
    @Param('id') id: string,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    await this.menusService.deleteMenuItem(id, user, request);
    return ApiResponseDto.empty('Ürün silindi');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.BRAND_OWNER, Role.BRANCH_MANAGER)
  @Get('branches/:branchId/items')
  @ApiOperation({ summary: 'Get branch item management list (Paginated)' })
  async getBranchItems(
    @Param('branchId') branchId: string,
    @Query() queryDto: GetBranchMenuItemsDto,
  ) {
    const result = await this.menusService.getBranchItemsForManagement(
      branchId,
      queryDto,
    );
    return ApiResponseDto.paginated(result.items, result.meta);
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
    Role.BRANCH_CASHIER,
  )
  @Get('branches/:branchId/items/:menuItemId')
  @ApiOperation({ summary: 'Get branch-effective menu item by id' })
  async getBranchMenuItemById(
    @Param('branchId') branchId: string,
    @Param('menuItemId') menuItemId: string,
  ) {
    const data = await this.menusService.findBranchMenuItemById(
      branchId,
      menuItemId,
    );
    return ApiResponseDto.ok(data);
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
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.upsertBranchMenuOverride(
      branchId,
      menuItemId,
      dto,
      user,
      request,
    );
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER, Role.BRAND_OWNER, Role.BRANCH_MANAGER)
  @Patch('branches/:branchId/items/overrides/bulk')
  @ApiOperation({ summary: 'Bulk update branch menu overrides' })
  async bulkBranchMenuOverrides(
    @Param('branchId') branchId: string,
    @Body() dto: BulkBranchMenuOverridesDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.bulkBranchMenuOverrides(
      branchId,
      dto,
      user,
      request,
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
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    await this.menusService.deleteBranchMenuOverride(
      branchId,
      menuItemId,
      user,
      request,
    );
    return ApiResponseDto.empty('Şube menü override silindi');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
    Role.MANAGER,
    Role.RESTAURANT_OWNER,
  )
  @Get('branches/:branchId/categories')
  @ApiOperation({ summary: 'Get categories for selected branch visibility' })
  async getBranchCategories(
    @Param('branchId') branchId: string,
    @Query() queryDto: GetBranchCategoriesDto,
    @GetUser() user: User,
  ) {
    const data = await this.menusService.getBranchCategories(
      branchId,
      queryDto,
      user,
    );
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
    Role.RESTAURANT_OWNER,
  )
  @Patch('branches/:branchId/categories/:categoryId/exclude')
  @ApiOperation({ summary: 'Exclude category for selected branch' })
  async excludeCategory(
    @Param('branchId') branchId: string,
    @Param('categoryId') categoryId: string,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.excludeCategory(
      branchId,
      categoryId,
      user,
      request,
    );
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
    Role.RESTAURANT_OWNER,
  )
  @Patch('branches/:branchId/categories/:categoryId/include')
  @ApiOperation({ summary: 'Include category for selected branch' })
  async includeCategory(
    @Param('branchId') branchId: string,
    @Param('categoryId') categoryId: string,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.includeCategory(
      branchId,
      categoryId,
      user,
      request,
    );
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
    Role.RESTAURANT_OWNER,
  )
  @Patch('branches/:branchId/categories/exclude-all')
  @ApiOperation({ summary: 'Exclude all or selected categories for branch' })
  async excludeAllCategories(
    @Param('branchId') branchId: string,
    @Body() body: UpdateBranchCategoriesBulkDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.excludeAllCategories(
      branchId,
      user,
      body.categoryIds,
      request,
    );
    return ApiResponseDto.ok(data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.SUPER_ADMIN,
    Role.BRAND_OWNER,
    Role.BRANCH_MANAGER,
    Role.RESTAURANT_OWNER,
  )
  @Patch('branches/:branchId/categories/include-all')
  @ApiOperation({ summary: 'Include all or selected categories for branch' })
  async includeAllCategories(
    @Param('branchId') branchId: string,
    @Body() body: UpdateBranchCategoriesBulkDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    const data = await this.menusService.includeAllCategories(
      branchId,
      user,
      body.categoryIds,
      request,
    );
    return ApiResponseDto.ok(data);
  }
}
