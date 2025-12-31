import { ResponseInterceptor } from './response.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should wrap response data with statusCode', (done) => {
      const mockData = { id: 1, name: 'test' };
      const mockStatusCode = 200;

      const mockExecutionContext = {
        switchToHttp: () => ({
          getResponse: () => ({
            statusCode: mockStatusCode,
          }),
        }),
      } as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of(mockData),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            statusCode: 200,
            data: mockData,
          });
          done();
        },
      });
    });

    it('should handle 201 status code', (done) => {
      const mockData = { created: true };

      const mockExecutionContext = {
        switchToHttp: () => ({
          getResponse: () => ({
            statusCode: 201,
          }),
        }),
      } as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of(mockData),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.statusCode).toBe(201);
          expect(result.data).toEqual(mockData);
          done();
        },
      });
    });

    it('should handle array data', (done) => {
      const mockData = [{ id: 1 }, { id: 2 }];

      const mockExecutionContext = {
        switchToHttp: () => ({
          getResponse: () => ({
            statusCode: 200,
          }),
        }),
      } as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of(mockData),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.data).toEqual(mockData);
          expect(Array.isArray(result.data)).toBe(true);
          done();
        },
      });
    });

    it('should handle null data', (done) => {
      const mockExecutionContext = {
        switchToHttp: () => ({
          getResponse: () => ({
            statusCode: 204,
          }),
        }),
      } as ExecutionContext;

      const mockCallHandler: CallHandler = {
        handle: () => of(null),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.statusCode).toBe(204);
          expect(result.data).toBeNull();
          done();
        },
      });
    });
  });
});
