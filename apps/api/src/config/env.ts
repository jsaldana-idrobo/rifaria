import { z } from 'zod';

const placeholderValues = new Set([
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'pk_test_placeholder',
  'prv_test_placeholder',
  'integrity_placeholder',
  'events_placeholder'
]);

const placeholderPattern = /^(<[^>]+>|.*placeholder.*|.*change-me.*)$/i;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i;

function isTemplateValue(value: string): boolean {
  return placeholderPattern.test(value.trim());
}

function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).trim();
}

function hasInvalidEmailIdentity(value: string): boolean {
  if (isTemplateValue(value)) {
    return true;
  }

  const email = extractEmailAddress(value);
  if (!emailPattern.test(email)) {
    return true;
  }

  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return domain.length === 0 || domain === 'localhost' || domain.endsWith('.local');
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    MONGODB_URI: z.string().default('mongodb://localhost:27017/rifaria'),
    JWT_ACCESS_SECRET: z.string().default('dev-access-secret-change-me'),
    JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-me'),
    WOMPI_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
    WOMPI_PUBLIC_KEY: z.string().default('pk_test_placeholder'),
    WOMPI_PRIVATE_KEY: z.string().default('prv_test_placeholder'),
    WOMPI_INTEGRITY_SECRET: z.string().default('integrity_placeholder'),
    WOMPI_EVENTS_SECRET: z.string().default('events_placeholder'),
    WEB_BASE_URL: z.string().default('http://localhost:4321'),
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    EMAIL_PROVIDER: z.enum(['console', 'resend', 'postmark']).default('console'),
    EMAIL_FROM: z.string().default('Rifaria <no-reply@rifaria.local>'),
    EMAIL_REPLY_TO: z.string().optional()
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER !== 'console' && hasInvalidEmailIdentity(env.EMAIL_FROM)) {
      ctx.addIssue({
        path: ['EMAIL_FROM'],
        code: z.ZodIssueCode.custom,
        message: 'EMAIL_FROM must use a valid non-local sender when EMAIL_PROVIDER is enabled'
      });
    }

    if (env.EMAIL_PROVIDER !== 'console' && env.EMAIL_REPLY_TO) {
      if (hasInvalidEmailIdentity(env.EMAIL_REPLY_TO)) {
        ctx.addIssue({
          path: ['EMAIL_REPLY_TO'],
          code: z.ZodIssueCode.custom,
          message:
            'EMAIL_REPLY_TO must use a valid non-local address when EMAIL_PROVIDER is enabled'
        });
      }
    }

    if (env.NODE_ENV !== 'production') {
      return;
    }

    if (
      placeholderValues.has(env.JWT_ACCESS_SECRET) ||
      isTemplateValue(env.JWT_ACCESS_SECRET) ||
      env.JWT_ACCESS_SECRET.length < 24
    ) {
      ctx.addIssue({
        path: ['JWT_ACCESS_SECRET'],
        code: z.ZodIssueCode.custom,
        message: 'JWT_ACCESS_SECRET must be a strong non-placeholder value in production'
      });
    }

    if (
      placeholderValues.has(env.JWT_REFRESH_SECRET) ||
      isTemplateValue(env.JWT_REFRESH_SECRET) ||
      env.JWT_REFRESH_SECRET.length < 24
    ) {
      ctx.addIssue({
        path: ['JWT_REFRESH_SECRET'],
        code: z.ZodIssueCode.custom,
        message: 'JWT_REFRESH_SECRET must be a strong non-placeholder value in production'
      });
    }

    if (placeholderValues.has(env.WOMPI_PUBLIC_KEY) || isTemplateValue(env.WOMPI_PUBLIC_KEY)) {
      ctx.addIssue({
        path: ['WOMPI_PUBLIC_KEY'],
        code: z.ZodIssueCode.custom,
        message: 'WOMPI_PUBLIC_KEY cannot be placeholder in production'
      });
    }

    if (placeholderValues.has(env.WOMPI_PRIVATE_KEY) || isTemplateValue(env.WOMPI_PRIVATE_KEY)) {
      ctx.addIssue({
        path: ['WOMPI_PRIVATE_KEY'],
        code: z.ZodIssueCode.custom,
        message: 'WOMPI_PRIVATE_KEY cannot be placeholder in production'
      });
    }

    if (
      placeholderValues.has(env.WOMPI_INTEGRITY_SECRET) ||
      isTemplateValue(env.WOMPI_INTEGRITY_SECRET)
    ) {
      ctx.addIssue({
        path: ['WOMPI_INTEGRITY_SECRET'],
        code: z.ZodIssueCode.custom,
        message: 'WOMPI_INTEGRITY_SECRET cannot be placeholder in production'
      });
    }

    if (
      placeholderValues.has(env.WOMPI_EVENTS_SECRET) ||
      isTemplateValue(env.WOMPI_EVENTS_SECRET)
    ) {
      ctx.addIssue({
        path: ['WOMPI_EVENTS_SECRET'],
        code: z.ZodIssueCode.custom,
        message: 'WOMPI_EVENTS_SECRET cannot be placeholder in production'
      });
    }

    if (env.WOMPI_ENV === 'production' && /test/i.test(env.WOMPI_PUBLIC_KEY)) {
      ctx.addIssue({
        path: ['WOMPI_PUBLIC_KEY'],
        code: z.ZodIssueCode.custom,
        message: 'WOMPI_PUBLIC_KEY looks like a test credential while WOMPI_ENV=production'
      });
    }

    if (isTemplateValue(env.WEB_BASE_URL) || !env.WEB_BASE_URL.startsWith('https://')) {
      ctx.addIssue({
        path: ['WEB_BASE_URL'],
        code: z.ZodIssueCode.custom,
        message: 'WEB_BASE_URL must use https in production'
      });
    }

    if (/(localhost|127\.0\.0\.1)/i.test(env.MONGODB_URI)) {
      ctx.addIssue({
        path: ['MONGODB_URI'],
        code: z.ZodIssueCode.custom,
        message: 'MONGODB_URI cannot point to localhost in production'
      });
    }

    if (['localhost', '127.0.0.1'].includes(env.REDIS_HOST.toLowerCase())) {
      ctx.addIssue({
        path: ['REDIS_HOST'],
        code: z.ZodIssueCode.custom,
        message: 'REDIS_HOST cannot point to localhost in production'
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  return parsed.data;
}
