import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoreEntity } from '../score/score.entity';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { CacheModule } from '../cache/cache.module';
import { JwtModule } from '@nestjs/jwt';
import { PlayerEntity } from '../player/player.entity';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([ScoreEntity, PlayerEntity]),
    CacheModule,
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
