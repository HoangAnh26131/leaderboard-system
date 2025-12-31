import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const CACHE_CLIENT = Symbol('CACHE_CLIENT');

export const CACHE_DEFAULT_TTL = 60; // seconds

export const redisProvider = {
  provide: CACHE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    return new Redis({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });
  },
};
