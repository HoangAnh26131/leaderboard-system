import { Module } from '@nestjs/common';
import { ScoreService } from './score.service';
import { ScoreController } from './score.controller';
import { PlayerModule } from '../player/player.module';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '../cache/cache.module';
import { SCORE_QUEUE } from './score.constant';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScoreEntity } from './score.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoreProcessor } from './score.processor';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([ScoreEntity]),
    CacheModule,
    PlayerModule,
    LeaderboardModule,
    BullModule.registerQueueAsync({
      name: SCORE_QUEUE,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        name: SCORE_QUEUE,
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: 3,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ScoreController],
  providers: [ScoreService, ScoreProcessor],
  exports: [ScoreService],
})
export class ScoreModule {}
