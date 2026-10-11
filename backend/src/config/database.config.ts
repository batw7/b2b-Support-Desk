import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const host = config.get<string>('DB_HOST') || 'localhost';
  const port = parseInt(config.get<string>('DB_PORT') || '5432', 10);
  const username = config.get<string>('DB_USERNAME') || 'postgres';
  const password = config.get<string>('DB_PASSWORD') ?? 'postgres';
  const database = config.get<string>('DB_DATABASE') || 'nevers_support';

  const useSsl =
    config.get<string>('DB_SSL') === 'true' || config.get<string>('DB_SSL') === 'require';
  const ssl = useSsl
    ? {
        rejectUnauthorized: config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false',
      }
    : false;

  const nodeEnv = config.get<string>('NODE_ENV') || 'development';
  const syncExplicit =
    config.get<string>('TYPEORM_SYNC') ?? config.get<string>('SYNCHRONIZE');
  const synchronize =
    syncExplicit === 'true' || (nodeEnv !== 'production' && syncExplicit !== 'false');

  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize,
    logging: config.get<string>('DB_LOGGING') === 'true',
    ssl: ssl || undefined,
    extra: {
      application_name: 'nevers-support-api',
      max: parseInt(config.get<string>('DB_POOL_MAX') || '20', 10),
    },
  };
}
