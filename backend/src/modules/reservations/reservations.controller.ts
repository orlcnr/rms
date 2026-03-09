import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { User } from '../users/entities/user.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GetReservationsDto } from './dto/get-reservations.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  private toReservationUser(user: User): {
    id: string;
    first_name?: string;
    last_name?: string;
    restaurantId: string;
  } {
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      restaurantId: user.restaurant_id,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create reservation with conflict check' })
  create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createReservationDto: CreateReservationDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.reservationsService
      .create(createReservationDto, this.toReservationUser(user), request)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Get()
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get reservations (paginated)' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filters: GetReservationsDto,
    @GetUser() user: User,
  ) {
    return this.reservationsService
      .findAll(filters, user.restaurant_id)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get reservation by id' })
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.reservationsService
      .findOne(id, user.restaurant_id)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update reservation details' })
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateReservationDto: UpdateReservationDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.reservationsService
      .update(id, updateReservationDto, this.toReservationUser(user), request)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update reservation status (manual NO_SHOW supported)' })
  updateStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateReservationStatusDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.reservationsService
      .updateStatus(id, dto.status, this.toReservationUser(user), request)
      .then((data) => ApiResponseDto.ok(data));
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Soft delete reservation' })
  delete(
    @Param('id') id: string,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.reservationsService
      .delete(id, this.toReservationUser(user), request)
      .then(() => ApiResponseDto.empty('Rezervasyon silindi'));
  }
}
