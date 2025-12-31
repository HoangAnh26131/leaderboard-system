import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHE_CLIENT, CACHE_DEFAULT_TTL } from './cache.constant';
import { TCacheSetOptions, TCacheValue } from './cache.types';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(CACHE_CLIENT)
    private readonly redis: Redis,
  ) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set(key: string, value: TCacheValue, options: TCacheSetOptions = {}): Promise<void> {
    const ttl = options.ttl ?? CACHE_DEFAULT_TTL;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    await this.redis.set(key, serialized, 'EX', ttl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async incr(key: string, ttl?: number): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);

    if (ttl) {
      pipeline.expire(key, ttl);
    }

    const execRes = await pipeline.exec();
    if (!execRes?.[0][1]) throw new Error('Failed to increment key');

    const value = execRes![0][1];

    return value as number;
  }

  async expire(key: string, ttl: number): Promise<number> {
    return this.redis.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async onModuleDestroy() {
    this.logger.log('Closing Redis connection');
    await this.redis.quit();
  }
}
