import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

type RequestWithId = Request & { requestId?: string };

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const now = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              requestId: request.requestId ?? null,
              method: request.method,
              path: request.originalUrl,
              statusCode: response.statusCode,
              durationMs: Date.now() - now,
              userAgent: request.headers['user-agent'] ?? null,
              ip: request.ip
            })
          );
        },
        error: (error: unknown) => {
          const statusCode =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof (error as { status?: unknown }).status === 'number'
              ? ((error as { status: number }).status as number)
              : 500;

          this.logger.error(
            JSON.stringify({
              requestId: request.requestId ?? null,
              method: request.method,
              path: request.originalUrl,
              statusCode,
              durationMs: Date.now() - now,
              userAgent: request.headers['user-agent'] ?? null,
              ip: request.ip
            })
          );
        }
      })
    );
  }
}
