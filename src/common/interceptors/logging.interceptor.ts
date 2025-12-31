import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const payload = {
      body: request.body,
      params: request.params,
      query: request.query,
      headers: request.headers,
    };

    const message = `[${request.url}] [${response.statusCode} - ${request.method}]: ${JSON.stringify(payload)}`;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.debug(message);
        },
        error: err => {
          this.logger.error(
            message,
            process.env.NODE_ENV === 'development' ? (err as any).stack : undefined,
          );
        },
      }),
    );
  }
}
