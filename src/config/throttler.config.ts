import { ConfigService } from '@nestjs/config';
import { ThrottlerAsyncOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [
      {
        ttl: config.get<number>('RATE_LIMIT_TTL', 60),
        limit: config.get<number>('RATE_LIMIT_MAX', 20),
      },
    ],
  }),
};
