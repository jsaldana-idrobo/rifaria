import { z } from 'zod';
import { hasInvalidEmailIdentity, isLoopbackHost, isTemplateValue } from '@rifaria/shared';

const placeholderValues = new Set([
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'pk_test_placeholder',
  'prv_test_placeholder',
  'integrity_placeholder',
  'events_placeholder',
  'resend_placeholder',
  'postmark_placeholder'
]);

function addIssue(ctx: z.RefinementCtx, path: string, message: string): void {
  ctx.addIssue({
    path: [path],
    code: z.ZodIssueCode.custom,
    message
  });
}

function hasPlaceholderCredential(value: string): boolean {
  return placeholderValues.has(value) || isTemplateValue(value);
}

function validateEmailConfiguration(env: AppEnv, ctx: z.RefinementCtx): void {
  if (env.EMAIL_PROVIDER === 'console') {
    return;
  }

  if (hasInvalidEmailIdentity(env.EMAIL_FROM)) {
    addIssue(
      ctx,
      'EMAIL_FROM',
      'EMAIL_FROM must use a valid non-local sender when EMAIL_PROVIDER is enabled'
    );
  }

  if (env.EMAIL_REPLY_TO && hasInvalidEmailIdentity(env.EMAIL_REPLY_TO)) {
    addIssue(
      ctx,
      'EMAIL_REPLY_TO',
      'EMAIL_REPLY_TO must use a valid non-local address when EMAIL_PROVIDER is enabled'
    );
  }
}

function validateInlineNotifications(env: AppEnv, ctx: z.RefinementCtx): void {
  if (env.NOTIFICATIONS_MODE !== 'inline') {
    return;
  }

  if (env.EMAIL_PROVIDER === 'console') {
    addIssue(
      ctx,
      'EMAIL_PROVIDER',
      'EMAIL_PROVIDER must be resend or postmark when NOTIFICATIONS_MODE=inline'
    );
  }

  if (
    env.EMAIL_PROVIDER === 'resend' &&
    (!env.RESEND_API_KEY || isTemplateValue(env.RESEND_API_KEY))
  ) {
    addIssue(
      ctx,
      'RESEND_API_KEY',
      'RESEND_API_KEY is required when EMAIL_PROVIDER=resend and inline mode is enabled'
    );
  }

  if (
    env.EMAIL_PROVIDER === 'postmark' &&
    (!env.POSTMARK_SERVER_TOKEN || isTemplateValue(env.POSTMARK_SERVER_TOKEN))
  ) {
    addIssue(
      ctx,
      'POSTMARK_SERVER_TOKEN',
      'POSTMARK_SERVER_TOKEN is required when EMAIL_PROVIDER=postmark and inline mode is enabled'
    );
  }
}

function validateProductionCredentials(env: AppEnv, ctx: z.RefinementCtx): void {
  const secretChecks = [
    [
      'JWT_ACCESS_SECRET',
      env.JWT_ACCESS_SECRET,
      'JWT_ACCESS_SECRET must be a strong non-placeholder value in production'
    ],
    [
      'JWT_REFRESH_SECRET',
      env.JWT_REFRESH_SECRET,
      'JWT_REFRESH_SECRET must be a strong non-placeholder value in production'
    ]
  ] as const;

  for (const [path, value, message] of secretChecks) {
    if (hasPlaceholderCredential(value) || value.length < 24) {
      addIssue(ctx, path, message);
    }
  }

  const wompiChecks = [
    [
      'WOMPI_PUBLIC_KEY',
      env.WOMPI_PUBLIC_KEY,
      'WOMPI_PUBLIC_KEY cannot be placeholder in production'
    ],
    [
      'WOMPI_PRIVATE_KEY',
      env.WOMPI_PRIVATE_KEY,
      'WOMPI_PRIVATE_KEY cannot be placeholder in production'
    ],
    [
      'WOMPI_INTEGRITY_SECRET',
      env.WOMPI_INTEGRITY_SECRET,
      'WOMPI_INTEGRITY_SECRET cannot be placeholder in production'
    ],
    [
      'WOMPI_EVENTS_SECRET',
      env.WOMPI_EVENTS_SECRET,
      'WOMPI_EVENTS_SECRET cannot be placeholder in production'
    ]
  ] as const;

  for (const [path, value, message] of wompiChecks) {
    if (hasPlaceholderCredential(value)) {
      addIssue(ctx, path, message);
    }
  }
}

function validateProductionInfrastructure(env: AppEnv, ctx: z.RefinementCtx): void {
  if (env.WOMPI_ENV === 'production' && env.WOMPI_PUBLIC_KEY.toLowerCase().includes('test')) {
    addIssue(
      ctx,
      'WOMPI_PUBLIC_KEY',
      'WOMPI_PUBLIC_KEY looks like a test credential while WOMPI_ENV=production'
    );
  }

  if (isTemplateValue(env.WEB_BASE_URL) || !env.WEB_BASE_URL.startsWith('https://')) {
    addIssue(ctx, 'WEB_BASE_URL', 'WEB_BASE_URL must use https in production');
  }

  if (isLoopbackHost(env.MONGODB_URI)) {
    addIssue(ctx, 'MONGODB_URI', 'MONGODB_URI cannot point to localhost in production');
  }

  if (isLoopbackHost(env.REDIS_HOST)) {
    addIssue(ctx, 'REDIS_HOST', 'REDIS_HOST cannot point to localhost in production');
  }

  if (!env.MAINTENANCE_TOKEN || isTemplateValue(env.MAINTENANCE_TOKEN)) {
    addIssue(
      ctx,
      'MAINTENANCE_TOKEN',
      'MAINTENANCE_TOKEN must be a strong non-placeholder value in production'
    );
  }

  if (env.MAINTENANCE_TOKEN && env.MAINTENANCE_TOKEN.length < 24) {
    addIssue(
      ctx,
      'MAINTENANCE_TOKEN',
      'MAINTENANCE_TOKEN must be at least 24 characters in production'
    );
  }
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
    NOTIFICATIONS_MODE: z.enum(['inline', 'queue']).default('queue'),
    EMAIL_PROVIDER: z.enum(['console', 'resend', 'postmark']).default('console'),
    EMAIL_FROM: z.string().default('Rifaria <no-reply@rifaria.local>'),
    EMAIL_REPLY_TO: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    POSTMARK_SERVER_TOKEN: z.string().optional(),
    POSTMARK_MESSAGE_STREAM: z.string().default('outbound'),
    MAINTENANCE_TOKEN: z.string().optional()
  })
  .superRefine((env, ctx) => {
    validateEmailConfiguration(env, ctx);
    validateInlineNotifications(env, ctx);

    if (env.NODE_ENV !== 'production') {
      return;
    }

    validateProductionCredentials(env, ctx);
    validateProductionInfrastructure(env, ctx);
  });

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  return parsed.data;
}
