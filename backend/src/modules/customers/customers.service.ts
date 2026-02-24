import {
  Injectable,
  NotFoundException,
  ConflictException,
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

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const existing = await this.customerRepository.findOne({
      where: { phone: createCustomerDto.phone },
    });
    if (existing) {
      throw new ConflictException(
        'Customer with this phone number already exists',
      );
    }

    const customer = this.customerRepository.create(createCustomerDto);
    return this.customerRepository.save(customer);
  }

  async findAll(queryDto: GetCustomersDto): Promise<Pagination<Customer>> {
    const { page = 1, limit = 10, search } = queryDto;

    const queryBuilder = this.customerRepository.createQueryBuilder('customer');

    if (search) {
      queryBuilder.where(
        '(customer.first_name ILIKE :search OR customer.last_name ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('customer.last_visit', 'DESC')
      .addOrderBy('customer.first_name', 'ASC');

    return paginate<Customer>(queryBuilder, { page, limit });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer)
      throw new NotFoundException(`Customer with ID ${id} not found`);
    return customer;
  }

  async search(query: string): Promise<Customer[]> {
    if (!query) return [];

    // Search by phone (exact or partial) or name (partial case-insensitive)
    return this.customerRepository
      .createQueryBuilder('customer')
      .where(
        'customer.phone LIKE :query OR customer.first_name ILIKE :query OR customer.last_name ILIKE :query',
        { query: `%${query}%` },
      )
      .take(10)
      .getMany();
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { phone } });
  }

  async update(
    id: string,
    updateCustomerDto: Partial<CreateCustomerDto>,
  ): Promise<Customer> {
    const customer = await this.findOne(id);
    Object.assign(customer, updateCustomerDto);
    return this.customerRepository.save(customer);
  }

  async updateStats(id: string, amountSpent: number): Promise<void> {
    const customer = await this.findOne(id);
    customer.visit_count += 1;
    customer.total_spent = Number(customer.total_spent) + Number(amountSpent);
    customer.last_visit = new Date();
    await this.customerRepository.save(customer);
  }
}
