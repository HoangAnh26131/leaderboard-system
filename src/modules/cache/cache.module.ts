import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CACHE_CLIENT, redisProvider } from './cache.constant';

@Global()
@Module({
  providers: [redisProvider, CacheService],
  exports: [CACHE_CLIENT, CacheService],
})
export class CacheModule {}
