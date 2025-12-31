import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, map, tap } from 'rxjs';
import { Response } from 'express';

export interface ResponseFormat<T> {
  statusCode: number;
  data?: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseFormat<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseFormat<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map(data => ({
        statusCode: response.statusCode,
        data,
      })),
    );
  }
}
