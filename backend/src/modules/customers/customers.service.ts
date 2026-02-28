import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { GetCustomersDto } from './dto/get-customers.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(
    createCustomerDto: CreateCustomerDto,
    restaurantId: string,
  ): Promise<Customer> {
    // Validate phone is provided
    if (!createCustomerDto.phone) {
      throw new BadRequestException('Phone number is required');
    }

    const existing = await this.customerRepository.findOne({
      where: { phone: createCustomerDto.phone, restaurantId },
    });
    if (existing) {
      throw new ConflictException(
        'Bu telefon numarası ile kayıtlı bir müşteri zaten var',
      );
    }

    try {
      const customer = this.customerRepository.create({
        ...createCustomerDto,
        restaurantId,
      });
      return await this.customerRepository.save(customer);
    } catch (error) {
      // Handle unique constraint violation from database
      if (error.code === '23505') {
        throw new ConflictException(
          'Bu telefon numarası başka bir müşteri tarafından kullanılıyor',
        );
      }
      throw error;
    }
  }

  async findAll(
    queryDto: GetCustomersDto,
    restaurantId: string,
  ): Promise<Pagination<Customer>> {
    const { page = 1, limit = 10, search } = queryDto;

    const queryBuilder = this.customerRepository.createQueryBuilder('customer');

    // Multi-tenant: Always filter by restaurant
    queryBuilder.where('customer.restaurantId = :restaurantId', {
      restaurantId,
    });

    if (search) {
      queryBuilder.andWhere(
        '(customer.first_name ILIKE :search OR customer.last_name ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('customer.last_visit', 'DESC')
      .addOrderBy('customer.first_name', 'ASC');

    return paginate<Customer>(queryBuilder, { page, limit });
  }

  async findOne(id: string, restaurantId: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, restaurantId },
    });
    if (!customer)
      throw new NotFoundException(`Customer with ID ${id} not found`);
    return customer;
  }

  async search(query: string, restaurantId: string): Promise<Customer[]> {
    if (!query) return [];

    // Search by phone (exact or partial) or name (partial case-insensitive)
    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.restaurantId = :restaurantId', { restaurantId })
      .andWhere(
        'customer.phone LIKE :query OR customer.first_name ILIKE :query OR customer.last_name ILIKE :query',
        { query: `%${query}%` },
      )
      .take(10)
      .getMany();
  }

  async findByPhone(
    phone: string,
    restaurantId: string,
  ): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { phone, restaurantId } });
  }

  async update(
    id: string,
    updateCustomerDto: Partial<CreateCustomerDto>,
    restaurantId: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id, restaurantId);

    // If phone is being updated, check for existing
    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existing = await this.customerRepository.findOne({
        where: { phone: updateCustomerDto.phone, restaurantId },
      });
      if (existing) {
        throw new ConflictException(
          'Bu telefon numarası ile kayıtlı bir müşteri zaten var',
        );
      }
    }

    Object.assign(customer, updateCustomerDto);

    try {
      return await this.customerRepository.save(customer);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'Bu telefon numarası başka bir müşteri tarafından kullanılıyor',
        );
      }
      throw error;
    }
  }

  async updateStats(
    id: string,
    restaurantId: string,
    amountSpent: number,
  ): Promise<void> {
    const customer = await this.findOne(id, restaurantId);
    customer.visit_count += 1;
    customer.total_spent = Number(customer.total_spent) + Number(amountSpent);
    customer.last_visit = new Date();
    await this.customerRepository.save(customer);
  }
}
