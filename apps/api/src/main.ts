import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

type RequestWithId = Request & { requestId?: string };

function attachRequestId(request: RequestWithId, requestId: string): void {
  request.requestId = requestId;
}

async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule, {
      cors: false
    });
    const configService = app.get(ConfigService);

    app.enableCors({
      origin: configService.get<string>('WEB_BASE_URL', 'http://localhost:4321'),
      credentials: true
    });

    app.use((request: RequestWithId, response: Response, next: NextFunction) => {
      const headerValue = request.header('x-request-id');
      const requestId =
        typeof headerValue === 'string' && headerValue.length > 0 && headerValue.length <= 128
          ? headerValue
          : randomUUID();

      attachRequestId(request, requestId);
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
  } catch (error: unknown) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(message);
    process.exit(1);
  }
}

void bootstrap(); // NOSONAR - NestJS runs in CommonJS here; top-level await would require a module-system change.
