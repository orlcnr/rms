import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { OrderStatus } from './enums/order-status.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { UpdateOrderItemsDto } from './dto/update-order-items.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { MoveOrderDto } from './dto/move-order.dto';
import { BatchUpdateStatusDto } from './dto/batch-update-status.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(
    Role.WAITER,
    Role.MANAGER,
    Role.RESTAURANT_OWNER,
    Role.SUPER_ADMIN,
    Role.BRANCH_WAITER,
    Role.BRANCH_MANAGER,
  ) // Updated roles
  @Get()
  @ApiOperation({ summary: 'Get filtered orders' })
  findAll(
    @GetUser() user: User,
    @Query('status') status?: string,
    @Query('waiterId') waiterId?: string,
    @Query('type') type?: string,
    @Query('tableId') tableId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.ordersService.findAll(
      user.restaurant_id,
      status,
      waiterId,
      type,
      tableId,
      parsedLimit,
    );
  }

  @Roles(
    Role.WAITER,
    Role.MANAGER,
    Role.RESTAURANT_OWNER,
    Role.SUPER_ADMIN,
    Role.BRANCH_WAITER,
    Role.BRANCH_MANAGER,
  )
  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @GetUser() user: User,
    @Req() request: ExpressRequest,
  ) {
    return this.ordersService.create(createOrderDto, user, request);
  }

  @Roles(
    Role.RESTAURANT_OWNER,
    Role.SUPER_ADMIN,
    Role.MANAGER,
    Role.BRANCH_MANAGER,
  )
  @Get('restaurants/:restaurantId')
  @ApiOperation({ summary: 'Get all orders for a restaurant' })
  findAllByRestaurant(@GetUser() user: User) {
    return this.ordersService.findAllByRestaurant(user.restaurant_id);
  }

  @Roles(
    Role.WAITER,
    Role.MANAGER,
    Role.RESTAURANT_OWNER,
    Role.SUPER_ADMIN,
    Role.CHEF,
    Role.BRANCH_WAITER,
    Role.BRANCH_MANAGER,
    Role.BRANCH_CHEF,
  )
  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Roles(
    Role.WAITER,
    Role.MANAGER,
    Role.RESTAURANT_OWNER,
    Role.SUPER_ADMIN,
    Role.CHEF,
    Role.BRANCH_WAITER,
    Role.BRANCH_MANAGER,
    Role.BRANCH_CHEF,
  )
  @SkipThrottle() // Real-time kitchen operation — no rate limit
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: Object.values(OrderStatus) },
        transaction_id: { type: 'string' },
      },
    },
  })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('transaction_id') transactionId: string | undefined,
    @GetUser() user: User,
    @Req() request: ExpressRequest,
  ) {
    return this.ordersService.updateStatus(
      id,
      status,
      transactionId,
      user,
      request,
    );
  }

  @Roles(
    Role.WAITER,
    Role.MANAGER,
    Role.RESTAURANT_OWNER,
    Role.SUPER_ADMIN,
    Role.CHEF,
    Role.BRANCH_WAITER,
    Role.BRANCH_MANAGER,
    Role.BRANCH_CHEF,
  )
  @SkipThrottle() // Batch real-time op — replaces N individual status updates
  @Patch('batch-status')
  @ApiOperation({
    summary: 'Batch update order statuses (single request for multiple orders)',
  })
  batchUpdateStatus(
    @Body() dto: BatchUpdateStatusDto,
    @GetUser() user: User,
    @Req() request: ExpressRequest,
  ) {
    return this.ordersService.batchUpdateStatus(
      dto.order_ids,
      dto.status,
      dto.transaction_id,
      user,
      request,
    );
  }

  @Roles(
    Role.RESTAURANT_OWNER,
    Role.MANAGER,
    Role.WAITER,
    Role.SUPER_ADMIN,
    Role.BRANCH_MANAGER,
    Role.BRANCH_WAITER,
  ) // Updated roles
  @Patch(':id/move-to-table')
  @ApiOperation({ summary: 'Move an order to another table' })
  @ApiBody({ type: MoveOrderDto })
  async moveOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: MoveOrderDto,
    @GetUser() user: User,
    @Req() request: ExpressRequest,
  ) {
    return this.ordersService.moveOrder(
      orderId,
      dto.new_table_id,
      user.restaurant_id,
      dto.on_target_occupied,
      user,
      request,
    );
  }

  @Roles(
    Role.RESTAURANT_OWNER,
    Role.SUPER_ADMIN,
    Role.MANAGER,
    Role.BRANCH_MANAGER,
  ) // Cleaned up roles
  @Patch(':id/items')
  @ApiOperation({ summary: 'Update order items' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 60 saniyede maksimum 20 istek
  updateItems(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: UpdateOrderItemsDto,
    @Req() request: ExpressRequest,
  ) {
    return this.ordersService.updateItems(
      id,
      dto.items,
      user.restaurant_id,
      dto.notes,
      dto.type,
      dto.customer_id,
      dto.address,
      dto.transaction_id,
      user,
      request,
    );
  }
}
