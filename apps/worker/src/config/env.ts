import { z } from 'zod';

const placeholderPattern = /^(<[^>]+>|.*placeholder.*|.*change-me.*)$/i;

function isTemplateValue(value: string): boolean {
  return placeholderPattern.test(value.trim());
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
    if (
      env.EMAIL_PROVIDER === 'resend' &&
      (!env.RESEND_API_KEY || isTemplateValue(env.RESEND_API_KEY))
    ) {
      ctx.addIssue({
        path: ['RESEND_API_KEY'],
        code: z.ZodIssueCode.custom,
        message: 'RESEND_API_KEY is required when EMAIL_PROVIDER=resend'
      });
    }

    if (
      env.EMAIL_PROVIDER === 'postmark' &&
      (!env.POSTMARK_SERVER_TOKEN || isTemplateValue(env.POSTMARK_SERVER_TOKEN))
    ) {
      ctx.addIssue({
        path: ['POSTMARK_SERVER_TOKEN'],
        code: z.ZodIssueCode.custom,
        message: 'POSTMARK_SERVER_TOKEN is required when EMAIL_PROVIDER=postmark'
      });
    }

    if (env.NODE_ENV !== 'production') {
      return;
    }

    if (isTemplateValue(env.MONGODB_URI) || /(localhost|127\.0\.0\.1)/i.test(env.MONGODB_URI)) {
      ctx.addIssue({
        path: ['MONGODB_URI'],
        code: z.ZodIssueCode.custom,
        message: 'MONGODB_URI cannot point to localhost in production'
      });
    }

    if (
      isTemplateValue(env.REDIS_HOST) ||
      ['localhost', '127.0.0.1'].includes(env.REDIS_HOST.toLowerCase())
    ) {
      ctx.addIssue({
        path: ['REDIS_HOST'],
        code: z.ZodIssueCode.custom,
        message: 'REDIS_HOST cannot point to localhost in production'
      });
    }

    if (env.EMAIL_PROVIDER === 'console') {
      ctx.addIssue({
        path: ['EMAIL_PROVIDER'],
        code: z.ZodIssueCode.custom,
        message: 'EMAIL_PROVIDER cannot be console in production'
      });
    }

    if (env.EMAIL_PROVIDER === 'resend' && env.RESEND_API_KEY === 'resend_placeholder') {
      ctx.addIssue({
        path: ['RESEND_API_KEY'],
        code: z.ZodIssueCode.custom,
        message: 'RESEND_API_KEY cannot be placeholder in production'
      });
    }

    if (env.EMAIL_PROVIDER === 'postmark' && env.POSTMARK_SERVER_TOKEN === 'postmark_placeholder') {
      ctx.addIssue({
        path: ['POSTMARK_SERVER_TOKEN'],
        code: z.ZodIssueCode.custom,
        message: 'POSTMARK_SERVER_TOKEN cannot be placeholder in production'
      });
    }

    if (isTemplateValue(env.EMAIL_FROM)) {
      ctx.addIssue({
        path: ['EMAIL_FROM'],
        code: z.ZodIssueCode.custom,
        message: 'EMAIL_FROM cannot be placeholder in production'
      });
    }

    if (env.EMAIL_REPLY_TO && isTemplateValue(env.EMAIL_REPLY_TO)) {
      ctx.addIssue({
        path: ['EMAIL_REPLY_TO'],
        code: z.ZodIssueCode.custom,
        message: 'EMAIL_REPLY_TO cannot be placeholder in production'
      });
    }
  });

export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const result = workerEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid worker environment: ${result.error.message}`);
  }

  return result.data;
}
