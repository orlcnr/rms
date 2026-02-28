# AGENTS.md - Restaurant Management System

## Project Overview

This is a full-stack restaurant management system with:
- **Backend**: NestJS with TypeORM, PostgreSQL, Redis (port 3001)
- **Frontend Web**: Next.js (port 3003)
- **Mobile**: React Native with Expo

---

## Build, Lint, and Test Commands

### Backend (NestJS)

```bash
cd backend

# Development
npm run start:dev          # Start with watch mode
npm run start:debug         # Start with debugging

# Production
npm run build               # Build for production
npm run start:prod          # Run production build

# Linting
npm run lint                # Lint and fix (eslint --fix)

# Testing
npm run test                # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage
npm run test:debug          # Debug tests with Node inspector

# Run single test file
npm run test -- customers.service.spec.ts
npm run test -- --testPathPattern=customers

# TypeORM migrations
npm run migration:run       # Run pending migrations
npm run migration:revert    # Revert last migration
npm run migration:generate  # Generate migration from entities
```

### Frontend Web (Next.js)

```bash
cd web

npm run dev                 # Development server (port 3003)
npm run build               # Production build
npm run start               # Production server (port 3003)
npm run lint                # Run Next.js linter
```

### Mobile (React Native/Expo)

```bash
cd mobile

npm start                   # Start Expo
npm run android             # Run on Android
npm run ios                 # Run on iOS
npm run web                 # Run on web
npm run lint                # Run Expo linter
```

---

## Code Style Guidelines

### General Conventions

- **Strings**: Single quotes (`'string'`) - enforced by Prettier
- **Trailing commas**: All trailing commas - enforced by Prettier
- **Line endings**: Auto (LF/CRLF handled by Prettier)
- **Indentation**: 2 spaces for TypeScript, follow existing file

### TypeScript Configuration

- Target: ES2023
- Strict null checks enabled
- No implicit `any` allowed
- Use `strict: true` patterns

### File Organization

```
src/
├── modules/
│   └── [feature]/
│       ├── [feature].module.ts
│       ├── [feature].controller.ts
│       ├── [feature].service.ts
│       ├── entities/
│       │   └── [feature].entity.ts
│       ├── dto/
│       │   ├── create-[feature].dto.ts
│       │   └── update-[feature].dto.ts
│       └── __tests__/
│           └── [feature].service.spec.ts
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   ├── entities/
│   └── services/
└── config/
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `customers.service.ts` |
| Classes | PascalCase | `CustomersService` |
| Functions | camelCase | `findAll()` |
| Variables | camelCase | `restaurantId` |
| DB Columns | snake_case | `restaurant_id` |
| Tables | snake_case (plural) | `customers` |
| Enums | PascalCase | `UserRole` |
| Enum Values | UPPER_SNAKE | `ADMIN` |

### Import Order

1. External libraries (`@nestjs/...`, `typeorm`, `class-validator`)
2. Internal modules (`../../modules/...`)
3. Common (`../../../common/...`)
4. Relative imports

```typescript
// External
import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IsString, IsNotEmpty } from 'class-validator';

// Internal modules
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';

// Common
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
```

### Entity Patterns

- Extend `BaseEntity` for all entities
- Use UUID primary keys (`@PrimaryGeneratedColumn('uuid')`)
- Add database indexes for frequently queried columns
- Use multi-tenant pattern: always include `restaurantId` column
- Use snake_case column names with TypeORM decorators

```typescript
@Entity('customers', { schema: 'business' })
export class Customer extends BaseEntity {
  @Column({ name: 'restaurant_id' })
  @Index('idx_customers_restaurant')
  restaurantId: string;

  @Column()
  @Index('idx_customers_phone_restaurant', ['phone', 'restaurantId'])
  phone: string;
}
```

### DTOs and Validation

- Use `class-validator` decorators
- Use `class-transformer` for transformation
- Add Swagger decorators (`@ApiProperty`, `@ApiPropertyOptional`)

```typescript
export class CreateCustomerDto {
  @ApiProperty({ example: 'Ahmet' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiPropertyOptional({ example: 'ahmet@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
```

### Controllers

- Use `@ApiTags` and `@ApiBearerAuth` for Swagger
- Always get `restaurantId` from `@GetUser()` decorator for multi-tenancy
- Use proper HTTP status codes

```typescript
@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  @Get()
  findAll(@Query() queryDto: GetCustomersDto, @GetUser() user: User) {
    return this.customersService.findAll(queryDto, user.restaurant_id);
  }
}
```

### Error Handling

- Use NestJS built-in exceptions (`NotFoundException`, `BadRequestException`, `ConflictException`)
- Throw appropriate HTTP exceptions with clear messages

```typescript
if (!customer) {
  throw new NotFoundException('Customer not found');
}
if (existing) {
  throw new ConflictException('Customer with this phone already exists');
}
```

### Guards and Decorators

- Use `@Public()` for public endpoints
- Use `@Roles(Role.ADMIN)` for role-based access
- Use `@GetUser()` to access authenticated user

### Testing

- Name test files: `[feature].service.spec.ts`
- Place in `__tests__` folder or alongside source files
- Use Jest with `describe`/`it` blocks
- Use `testRegex: ".*\\.spec\\.ts$"` pattern

```typescript
describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CustomersService],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Database Migrations

- Create migrations in `src/migrations/`
- Use TypeORM CLI: `npm run migration:generate`
- Migration files: `[timestamp]-[migration-name].ts`

### Multi-Tenancy

- Always filter queries by `restaurantId` from authenticated user
- Never expose restaurant IDs unnecessarily
- Use soft deletes (`deleted_at`) for data safety

---

## Environment Variables

Backend requires:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing key
- `PORT` - Server port (default 3001)

---

## Notes for Agents

- Always run `npm run lint` and `npm run test` before committing
- For backend, prefer TypeORM QueryBuilder for complex queries
- Use Redis caching via `RestaurantCacheInterceptor` for frequently accessed data
- Follow existing patterns in the codebase when adding new features
