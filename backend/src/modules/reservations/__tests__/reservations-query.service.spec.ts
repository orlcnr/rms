import { paginate } from 'nestjs-typeorm-paginate';
import { ReservationStatus } from '../entities/reservation.entity';
import { ReservationQueryFactory } from '../query/factories/reservation-query.factory';
import { ReservationRepository } from '../repositories/reservation.repository';
import { ReservationsQueryService } from '../services/reservations-query.service';

jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('ReservationsQueryService', () => {
  const paginateMock = paginate as jest.MockedFunction<typeof paginate>;

  const qb = {
    orderBy: jest.fn().mockReturnThis(),
  } as any;

  const reservation = {
    id: 'res-1',
    restaurant_id: 'rest-1',
    customer_id: 'cust-1',
    table_id: 'table-1',
    reservation_time: new Date('2026-03-08T20:30:00.000Z'), // 23:30 Europe/Istanbul
    guest_count: 4,
    prepayment_amount: 150,
    status: ReservationStatus.PENDING,
    notes: null,
    created_at: new Date('2026-03-08T12:00:00.000Z'),
    updated_at: new Date('2026-03-08T12:30:00.000Z'),
    customer: {
      id: 'cust-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      phone: '5550000000',
    },
    table: {
      id: 'table-1',
      name: 'Masa 1',
    },
  } as any;

  let reservationRepository: jest.Mocked<ReservationRepository>;
  let reservationQueryFactory: jest.Mocked<ReservationQueryFactory>;
  let service: ReservationsQueryService;

  beforeEach(() => {
    jest.clearAllMocks();

    reservationRepository = {
      createBaseListQuery: jest.fn().mockReturnValue(qb),
    } as unknown as jest.Mocked<ReservationRepository>;

    reservationQueryFactory = {
      create: jest.fn().mockReturnValue([
        {
          apply: jest.fn(),
        } as any,
      ]),
    } as unknown as jest.Mocked<ReservationQueryFactory>;

    service = new ReservationsQueryService(
      reservationRepository,
      reservationQueryFactory,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should normalize "today" filter using Istanbul timezone date (23:30 boundary)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-08T20:30:00.000Z'));

    paginateMock.mockResolvedValueOnce({
      items: [reservation],
      meta: {
        itemCount: 1,
        totalItems: 1,
        totalPages: 1,
      },
    } as any);

    await service.findAll('rest-1', {
      date: 'today',
      page: 1,
      limit: 10,
    });

    const expectedIstanbulDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
    }).format(new Date('2026-03-08T20:30:00.000Z'));

    expect(reservationQueryFactory.create).toHaveBeenCalledWith(
      expect.objectContaining({ date: expectedIstanbulDate }),
      { restaurantId: 'rest-1' },
    );

  });

  it('should return paginated items/meta mapped for response contract', async () => {
    paginateMock.mockResolvedValueOnce({
      items: [reservation],
      meta: {
        itemCount: 1,
        totalItems: 1,
        totalPages: 1,
      },
    } as any);

    const result = await service.findAll('rest-1', {
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'res-1',
      restaurant_id: 'rest-1',
      customer_id: 'cust-1',
      table_id: 'table-1',
      status: ReservationStatus.PENDING,
    });
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 10,
      totalItems: 1,
      itemCount: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
  });
});
