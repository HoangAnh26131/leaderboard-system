import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ETimeframe } from '../leaderboard.type';

export class LeaderboardPlayerRankDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(ETimeframe)
  timeframe: ETimeframe;
}
