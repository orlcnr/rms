import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../../docker/env/.env.dev') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'rms_db',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  // Don't set default schema - migrations table will be in public schema
  // Entities have their own schema specified in decorators
});
