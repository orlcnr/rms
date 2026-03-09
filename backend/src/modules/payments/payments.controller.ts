import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  CreateSplitPaymentDto,
  RevertPaymentDto,
} from './dto/create-split-payment.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '../users/entities/user.entity';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Process a single payment' })
  create(
    @GetUser() user: User,
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() request: Request,
  ) {
    return this.paymentsService
      .create(createPaymentDto, user.id, user, request)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Post('split')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Process split payment (multiple payment methods)',
    description:
      'Bir sipariş için birden fazla ödeme yöntemi kullanarak ödeme yapılmasını sağlar. Örn: 500 TL Nakit + 500 TL Açık Hesap',
  })
  createSplitPayment(
    @GetUser() user: User,
    @Body() dto: CreateSplitPaymentDto,
    @Req() request: Request,
  ) {
    return this.paymentsService
      .createSplitPayment(dto, user.id, user, request)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Post('revert')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Revert/refund a payment',
    description: 'Bir ödemeyi iptal eder ve gerekirse müşteri borcunu düzeltir',
  })
  revertPayment(
    @GetUser() user: User,
    @Body() dto: RevertPaymentDto,
    @Req() request: Request,
  ) {
    return this.paymentsService
      .revertPayment(
        dto.payment_id,
        dto.reason,
        dto.refund_method,
        user,
        request,
      )
      .then((data) => ApiResponseDto.ok(data));
  }

  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payments for an order' })
  findAllByOrder(@Param('orderId') orderId: string, @GetUser() user: User) {
    return this.paymentsService
      .findAllByOrder(orderId, user.restaurant_id)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all payments (History - Paginated)' })
  findAll(@Query() queryDto: GetPaymentsDto, @GetUser() user: User) {
    return this.paymentsService.findAll(queryDto, user.restaurant_id).then((data) =>
      ApiResponseDto.ok(data),
    );
  }
}
