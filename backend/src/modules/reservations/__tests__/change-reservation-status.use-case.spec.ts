import { BadRequestException } from '@nestjs/common';
import { ReservationStatus } from '../entities/reservation.entity';
import { ReservationRepository } from '../repositories/reservation.repository';
import { ChangeReservationStatusUseCase } from '../use-cases/change-reservation-status.use-case';

describe('ChangeReservationStatusUseCase', () => {
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let useCase: ChangeReservationStatusUseCase;

  beforeEach(() => {
    reservationRepository = {
      findOneInRestaurant: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<ReservationRepository>;

    useCase = new ChangeReservationStatusUseCase(reservationRepository);
  });

  it('should allow CONFIRMED -> ARRIVED', async () => {
    const reservation = {
      id: 'res-1',
      status: ReservationStatus.CONFIRMED,
    } as any;
    reservationRepository.findOneInRestaurant.mockResolvedValueOnce(reservation);
    reservationRepository.save.mockResolvedValueOnce({
      ...reservation,
      status: ReservationStatus.ARRIVED,
    } as any);

    const result = await useCase.execute(
      'res-1',
      ReservationStatus.ARRIVED,
      'rest-1',
    );

    expect(result.status).toBe(ReservationStatus.ARRIVED);
    expect(reservationRepository.save).toHaveBeenCalled();
  });

  it('should be no-op for ARRIVED -> ARRIVED', async () => {
    const reservation = {
      id: 'res-1',
      status: ReservationStatus.ARRIVED,
    } as any;
    reservationRepository.findOneInRestaurant.mockResolvedValueOnce(reservation);

    const result = await useCase.execute(
      'res-1',
      ReservationStatus.ARRIVED,
      'rest-1',
    );

    expect(result).toBe(reservation);
    expect(reservationRepository.save).not.toHaveBeenCalled();
  });

  it('should allow ARRIVED -> CANCELLED', async () => {
    const reservation = {
      id: 'res-1',
      status: ReservationStatus.ARRIVED,
    } as any;
    reservationRepository.findOneInRestaurant.mockResolvedValueOnce(reservation);
    reservationRepository.save.mockResolvedValueOnce({
      ...reservation,
      status: ReservationStatus.CANCELLED,
    } as any);

    const result = await useCase.execute(
      'res-1',
      ReservationStatus.CANCELLED,
      'rest-1',
    );

    expect(result.status).toBe(ReservationStatus.CANCELLED);
  });

  it('should reject terminal -> ARRIVED transition', async () => {
    const reservation = {
      id: 'res-1',
      status: ReservationStatus.CANCELLED,
    } as any;
    reservationRepository.findOneInRestaurant.mockResolvedValueOnce(reservation);

    await expect(
      useCase.execute('res-1', ReservationStatus.ARRIVED, 'rest-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(reservationRepository.save).not.toHaveBeenCalled();
  });
});

