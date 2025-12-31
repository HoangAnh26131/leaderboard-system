import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ETimeframe } from '../leaderboard.type';
import {
  LEADERBOARD_RETRIEVAL_LIMIT_DEFAULT,
  LEADERBOARD_RETRIEVAL_LIMIT_MAX,
} from '../leaderboard.constant';

export class LeaderboardRetrievalDto {
  @IsOptional()
  @IsEnum(ETimeframe)
  timeframe: ETimeframe = ETimeframe.ALLTIME;

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(LEADERBOARD_RETRIEVAL_LIMIT_MAX, {
    message: `Limit must be between 1 and ${LEADERBOARD_RETRIEVAL_LIMIT_MAX}`,
  })
  limit: number = LEADERBOARD_RETRIEVAL_LIMIT_DEFAULT;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Offset must be greater than 0' })
  offset: number = 0;

  @IsString()
  @IsOptional()
  playerId: string = '';
}
