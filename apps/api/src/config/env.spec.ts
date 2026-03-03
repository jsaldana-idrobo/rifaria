import { loadEnv } from './env';

describe('loadEnv (api)', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('fails in production with placeholder secrets', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production'
    };

    expect(() => loadEnv()).toThrow(/Invalid environment configuration/);
  });

  it('accepts production configuration with real credentials', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      PORT: '4000',
      MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/rifaria',
      JWT_ACCESS_SECRET: 'access-super-secret-value-123456',
      JWT_REFRESH_SECRET: 'refresh-super-secret-value-123456',
      WOMPI_ENV: 'production',
      WOMPI_PUBLIC_KEY: 'pub_prod_live_12345',
      WOMPI_PRIVATE_KEY: 'prv_prod_live_12345',
      WOMPI_INTEGRITY_SECRET: 'integrity-secret-live-12345',
      WOMPI_EVENTS_SECRET: 'events-secret-live-12345',
      WEB_BASE_URL: 'https://rifaria.co',
      REDIS_HOST: 'redis.internal',
      REDIS_PORT: '6379',
      EMAIL_PROVIDER: 'postmark',
      EMAIL_FROM: 'Rifaria <no-reply@rifaria.co>'
    };

    expect(() => loadEnv()).not.toThrow();
  });
});
