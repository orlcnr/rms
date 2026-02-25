import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { GetCustomersDto } from './dto/get-customers.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  create(@Body() createCustomerDto: CreateCustomerDto, @GetUser() user: User) {
    return this.customersService.create(createCustomerDto, user.restaurant_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer details' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @GetUser() user: User,
  ) {
    return this.customersService.update(id, updateCustomerDto, user.restaurant_id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers (Paginated)' })
  findAll(@Query() queryDto: GetCustomersDto, @GetUser() user: User) {
    return this.customersService.findAll(queryDto, user.restaurant_id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search customers by phone or name' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query (phone or name)',
  })
  search(@Query('q') query: string, @GetUser() user: User) {
    return this.customersService.search(query, user.restaurant_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.customersService.findOne(id, user.restaurant_id);
  }
}
