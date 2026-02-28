import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
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

@ApiTags('Reservations')
@Controller('reservations')
@ApiBearerAuth()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new reservation with conflict check' })
  create(
    @Body() createReservationDto: CreateReservationDto,
    @GetUser() user: any,
  ) {
    return this.reservationsService.create(createReservationDto, user);
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
    @GetUser() user?: any,
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
      user?.restaurantId,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update reservation details' })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @GetUser() user: any,
  ) {
    return this.reservationsService.update(id, updateReservationDto, user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update reservation status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ReservationStatus,
    @GetUser() user: any,
  ) {
    return this.reservationsService.updateStatus(id, status, user);
  }
}
