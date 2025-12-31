import { IsEnum, IsOptional } from 'class-validator';
import { ETimeframe } from '../leaderboard.type';

export class LeaderboardPlayerRankDto {
  @IsOptional()
  @IsEnum(ETimeframe)
  timeframe: ETimeframe = ETimeframe.ALLTIME;
}
