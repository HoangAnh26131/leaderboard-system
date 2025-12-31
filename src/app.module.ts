import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { throttlerConfig } from './config/throttler.config';
import { AuthWalletModule } from './modules/auth-wallet/auth-wallet.module';
import { CacheModule } from './modules/cache/cache.module';
import { PlayerModule } from './modules/player/player.module';
import { ScoreModule } from './modules/score/score.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot(appConfig),

    // Database
    TypeOrmModule.forRootAsync(databaseConfig),

    // Rate limiting
    ThrottlerModule.forRootAsync(throttlerConfig),

    // Feature modules
    CacheModule,
    PlayerModule,
    AuthWalletModule,
    ScoreModule,
    LeaderboardModule,
  ],
})
export class AppModule {}
