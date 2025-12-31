import { Type } from 'class-transformer';
import { IsString, IsNumber, Max, IsDate, IsObject, Min, IsNotEmpty } from 'class-validator';
import { SCORE_MAX } from '../score.constant';

export class ScoreSubmitDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0, { message: 'Score cannot be negative' })
  @Max(SCORE_MAX, { message: `Score cannot exceed ${SCORE_MAX}` })
  score: number;

  @IsObject()
  @IsNotEmpty()
  metadata: { level: number; timespent: number; [x: string]: string | number };

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  timestamp: Date;
}
