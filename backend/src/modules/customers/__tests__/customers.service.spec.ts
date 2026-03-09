import { ConflictException, NotFoundException } from '@nestjs/common';
import { paginate } from 'nestjs-typeorm-paginate';
import { CustomersService } from '../customers.service';

jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('CustomersService', () => {
  const paginateMock = paginate as jest.MockedFunction<typeof paginate>;

  function buildService() {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };

    const customerRepository = {
      findOne: jest.fn(),
      create: jest.fn((payload: Record<string, unknown>) => payload),
      save: jest.fn(async (payload: Record<string, unknown>) => payload),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    const orderRepository = {
      find: jest.fn(),
    };

    const auditService = {
      safeEmitLog: jest.fn().mockResolvedValue(undefined),
      markRequestAsAudited: jest.fn(),
    };

    const service = new CustomersService(
      customerRepository as never,
      orderRepository as never,
      auditService as never,
    );

    return {
      service,
      customerRepository,
      orderRepository,
      auditService,
      queryBuilder,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findAll should apply deleted_at visibility filter', async () => {
    const { service, queryBuilder } = buildService();
    paginateMock.mockResolvedValueOnce({
      items: [],
      meta: {
        itemCount: 0,
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
      },
    } as never);

    await service.findAll({ page: 1, limit: 10 }, 'rest-1');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'customer.deleted_at IS NULL',
    );
  });

  it('search should exclude soft-deleted customers', async () => {
    const { service, queryBuilder } = buildService();
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await service.search('ada', 'rest-1');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'customer.deleted_at IS NULL',
    );
  });

  it('findOne should throw 404 when customer is soft deleted or missing', async () => {
    const { service, queryBuilder } = buildService();
    queryBuilder.getOne.mockResolvedValueOnce(null);

    await expect(service.findOne('cust-1', 'rest-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove should use softRemove instead of hard remove', async () => {
    const { service, customerRepository, queryBuilder } = buildService();
    const customer = {
      id: 'cust-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      phone: '555',
    };
    queryBuilder.getOne.mockResolvedValue(customer);
    customerRepository.softRemove.mockResolvedValue(undefined);

    await service.remove('cust-1', 'rest-1');

    expect(customerRepository.softRemove).toHaveBeenCalledWith(customer);
  });

  it('create should throw conflict for duplicated phone in active customers', async () => {
    const { service, queryBuilder } = buildService();
    queryBuilder.getOne.mockResolvedValueOnce({ id: 'existing-customer' });

    await expect(
      service.create(
        { first_name: 'Ada', last_name: 'Lovelace', phone: '555' },
        'rest-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should continue domain operation when audit logging fails (fail-open)', async () => {
    const { service, customerRepository, queryBuilder, auditService } =
      buildService();
    const customer = {
      id: 'cust-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      phone: '555',
    };
    queryBuilder.getOne.mockResolvedValue(customer);
    customerRepository.softRemove.mockResolvedValue(undefined);
    auditService.safeEmitLog.mockRejectedValueOnce(
      new Error('audit transport down'),
    );

    await expect(service.remove('cust-1', 'rest-1')).resolves.toBeUndefined();
    expect(customerRepository.softRemove).toHaveBeenCalledWith(customer);
  });
});

