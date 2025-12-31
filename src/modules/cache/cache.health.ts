import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class CacheHealthIndicator {
  constructor(private readonly cache: CacheService) {}

  async isHealthy(): Promise<boolean> {
    try {
      await this.cache.set('health:check', 'ok', { ttl: 5 });
      return true;
    } catch {
      return false;
    }
  }
}
