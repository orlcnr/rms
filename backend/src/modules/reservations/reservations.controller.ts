import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationStatus } from './entities/reservation.entity';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { UpdateReservationDto } from './dto/update-reservation.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { User } from '../users/entities/user.entity';

@ApiTags('Reservations')
@Controller('reservations')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Create a new reservation with conflict check' })
  create(
    @Body() createReservationDto: CreateReservationDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.reservationsService.create(
      createReservationDto,
      this.toReservationUser(user),
      request,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get reservations, optionally filtered by date or date range',
  })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser() user?: User,
  ) {
    let normalizedDate = date;

    if (date && date.toLowerCase() === 'today') {
      // Format today's date as YYYY-MM-DD for consistency ensuring Istanbul timezone
      normalizedDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
      }).format(new Date());
    }

    return this.reservationsService.findAll(
      { date: normalizedDate, startDate, endDate },
      user?.restaurant_id,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update reservation details' })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.reservationsService.update(
      id,
      updateReservationDto,
      this.toReservationUser(user),
      request,
    );
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update reservation status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ReservationStatus,
    @GetUser() user: User,
    @Req() request: Request,
  ) {
    return this.reservationsService.updateStatus(
      id,
      status,
      this.toReservationUser(user),
      request,
    );
  }
}
