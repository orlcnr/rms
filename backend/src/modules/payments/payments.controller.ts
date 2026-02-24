import { Controller, Post, Body, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateSplitPaymentDto, RevertPaymentDto } from './dto/create-split-payment.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Request } from 'express';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Process a single payment' })
  create(@GetUser() user: any, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto, user.id);
  }

  @Post('split')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Process split payment (multiple payment methods)',
    description: 'Bir sipariş için birden fazla ödeme yöntemi kullanarak ödeme yapılmasını sağlar. Örn: 500 TL Nakit + 500 TL Açık Hesap'
  })
  createSplitPayment(
    @GetUser() user: any, 
    @Body() dto: CreateSplitPaymentDto
  ) {
    return this.paymentsService.createSplitPayment(dto, user.id);
  }

  @Post('revert')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Revert/refund a payment',
    description: 'Bir ödemeyi iptal eder ve gerekirse müşteri borcunu düzeltir'
  })
  revertPayment(
    @GetUser() user: any,
    @Body() dto: RevertPaymentDto
  ) {
    return this.paymentsService.revertPayment(dto.payment_id, dto.reason, user.id);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get payments for an order' })
  findAllByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findAllByOrder(orderId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments (History - Paginated)' })
  findAll(@Query() queryDto: GetPaymentsDto) {
    return this.paymentsService.findAll(queryDto);
  }
}
