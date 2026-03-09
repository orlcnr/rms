import { NotFoundException } from '@nestjs/common';
import { ReservationRepository } from '../repositories/reservation.repository';
import { CreateReservationUseCase } from '../use-cases/create-reservation.use-case';

describe('CreateReservationUseCase', () => {
  function buildUseCase() {
    const reservationRepository = {
      findConflict: jest.fn(),
      create: jest.fn((payload: Record<string, unknown>) => payload),
      save: jest.fn(async (payload: Record<string, unknown>) => payload),
    } as unknown as jest.Mocked<ReservationRepository>;

    const customersService = {
      findOne: jest.fn(),
    };

    const settingsService = {
      getSetting: jest.fn().mockResolvedValue(120),
    };

    const useCase = new CreateReservationUseCase(
      reservationRepository,
      customersService as never,
      settingsService as never,
    );

    return { useCase, reservationRepository, customersService };
  }

  it('should fail when customer is soft-deleted/not found', async () => {
    const { useCase, customersService, reservationRepository } = buildUseCase();
    customersService.findOne.mockRejectedValueOnce(
      new NotFoundException('Customer with ID cust-1 not found'),
    );

    await expect(
      useCase.execute(
        {
          customer_id: 'cust-1',
          table_id: 'table-1',
          reservation_time: '2026-03-10T18:00:00.000Z',
          guest_count: 2,
          prepayment_amount: 0,
          notes: '',
        },
        'rest-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(reservationRepository.findConflict).not.toHaveBeenCalled();
  });
});

