import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

NestFactory.create(AppModule, {
  cors: false
})
  .then(async (app) => {
    const configService = app.get(ConfigService);

    app.enableCors({
      origin: configService.get<string>('WEB_BASE_URL', 'http://localhost:4321'),
      credentials: true
    });

    app.use((request: Request, response: Response, next: NextFunction) => {
      const headerValue = request.header('x-request-id');
      const requestId =
        typeof headerValue === 'string' && headerValue.length > 0 && headerValue.length <= 128
          ? headerValue
          : randomUUID();

      (request as Request & { requestId?: string }).requestId = requestId;
      response.setHeader('x-request-id', requestId);
      next();
    });

    app.setGlobalPrefix('v1');
    app.useGlobalInterceptors(new HttpLoggingInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );

    await app.listen(configService.get<number>('PORT', 4000));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(message);
    process.exit(1);
  }); // NOSONAR - NestJS CommonJS bootstrap cannot use top-level await without changing runtime module format.
