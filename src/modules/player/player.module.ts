import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerEntity } from './player.entity';
import { PlayerService } from './player.service';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [JwtModule.register({}), CacheModule, TypeOrmModule.forFeature([PlayerEntity])],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
