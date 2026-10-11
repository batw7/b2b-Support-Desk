import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

config({ path: join(__dirname, '../../.env') });

const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '5432', 10);
const username = process.env.DB_USERNAME || 'postgres';
const password = process.env.DB_PASSWORD ?? 'postgres';
const database = process.env.DB_DATABASE || 'nevers_support';
const useSsl =
  process.env.DB_SSL === 'true' || process.env.DB_SSL === 'require';
const ssl = useSsl
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : false;

export default new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  ssl: ssl || undefined,
});
