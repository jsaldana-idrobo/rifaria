import { z } from 'zod';
import { hasInvalidEmailIdentity, isLoopbackHost, isTemplateValue } from '@rifaria/shared';

function addIssue(ctx: z.RefinementCtx, path: string, message: string): void {
  ctx.addIssue({
    path: [path],
    code: z.ZodIssueCode.custom,
    message
  });
}

function validateProviderCredentials(env: WorkerEnv, ctx: z.RefinementCtx): void {
  if (
    env.EMAIL_PROVIDER === 'resend' &&
    (!env.RESEND_API_KEY || isTemplateValue(env.RESEND_API_KEY))
  ) {
    addIssue(ctx, 'RESEND_API_KEY', 'RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
  }

  if (
    env.EMAIL_PROVIDER === 'postmark' &&
    (!env.POSTMARK_SERVER_TOKEN || isTemplateValue(env.POSTMARK_SERVER_TOKEN))
  ) {
    addIssue(
      ctx,
      'POSTMARK_SERVER_TOKEN',
      'POSTMARK_SERVER_TOKEN is required when EMAIL_PROVIDER=postmark'
    );
  }
}

function validateSenderConfiguration(env: WorkerEnv, ctx: z.RefinementCtx): void {
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

function validateProductionInfrastructure(env: WorkerEnv, ctx: z.RefinementCtx): void {
  if (isTemplateValue(env.MONGODB_URI) || isLoopbackHost(env.MONGODB_URI)) {
    addIssue(ctx, 'MONGODB_URI', 'MONGODB_URI cannot point to localhost in production');
  }

  if (isTemplateValue(env.REDIS_HOST) || isLoopbackHost(env.REDIS_HOST)) {
    addIssue(ctx, 'REDIS_HOST', 'REDIS_HOST cannot point to localhost in production');
  }

  if (env.EMAIL_PROVIDER === 'console') {
    addIssue(ctx, 'EMAIL_PROVIDER', 'EMAIL_PROVIDER cannot be console in production');
  }

  if (env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY === 'resend_placeholder') {
    addIssue(ctx, 'RESEND_API_KEY', 'RESEND_API_KEY cannot be placeholder in production');
  }

  if (env.EMAIL_PROVIDER === 'postmark' && env.POSTMARK_SERVER_TOKEN === 'postmark_placeholder') {
    addIssue(
      ctx,
      'POSTMARK_SERVER_TOKEN',
      'POSTMARK_SERVER_TOKEN cannot be placeholder in production'
    );
  }
}

const workerEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    MONGODB_URI: z.string().default('mongodb://localhost:27017/rifaria'),
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    EMAIL_PROVIDER: z.enum(['console', 'resend', 'postmark']).default('console'),
    EMAIL_FROM: z.string().default('Rifaria <no-reply@rifaria.local>'),
    EMAIL_REPLY_TO: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    POSTMARK_SERVER_TOKEN: z.string().optional(),
    POSTMARK_MESSAGE_STREAM: z.string().default('outbound')
  })
  .superRefine((env, ctx) => {
    validateProviderCredentials(env, ctx);
    validateSenderConfiguration(env, ctx);

    if (env.NODE_ENV !== 'production') {
      return;
    }

    validateProductionInfrastructure(env, ctx);
  });

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const result = workerEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid worker environment: ${result.error.message}`);
  }

  return result.data;
}
