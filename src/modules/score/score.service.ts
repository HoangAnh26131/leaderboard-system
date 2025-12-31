import {
  Injectable,
  BadRequestException,
  Inject,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PlayerService } from '../player/player.service';
import { TScoreSubmitPayload } from './score.types';
import {
  SCORE_IMPOSSIBLE_JUMP_LEVEL,
  SCORE_MAX_SUBMISSIONS_PER_MINUTE,
  SCORE_PROCESSOR_SAVE_SCORE,
  SCORE_QUEUE,
  SCORE_SUBMISSION_RATE_LIMIT_KEY,
  SCORE_TIMESPENT_MIN,
} from './score.constant';
import { CACHE_CLIENT } from '../cache/cache.constant';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ScoreEntity } from './score.entity';
import { Repository } from 'typeorm';
import { TooManyRequestsException } from '../../common/exceptions/too-many-request.exception';

@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);

  constructor(
    @Inject(CACHE_CLIENT)
    private readonly redis: Redis,
    @InjectRepository(ScoreEntity)
    private readonly scoreRepository: Repository<ScoreEntity>,
    @InjectQueue(SCORE_QUEUE) private readonly scoreQueue: Queue,
    private readonly playerService: PlayerService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  async submit(playerRequestId: string, payload: TScoreSubmitPayload) {
    payload.timestamp = new Date();
    const { playerId, score, timestamp } = payload;

    if (playerRequestId !== playerId) throw new ForbiddenException('Player is not allowed');

    const impossibleJump = await this.detectImpossibleJumps(payload);
    if (impossibleJump) {
      this.logger.warn('Impossible jump detected on:', payload);

      throw new BadRequestException(
        'Impossible jump or invalid score submissions payload detected!',
      );
    }

    // Rate limit per player
    await this.checkRateLimitSliding(playerId);

    const isExistTimestamp = await this.scoreRepository.findOne({ where: { playerId, timestamp } });
    if (isExistTimestamp)
      throw new BadRequestException('Impossible jump or invalid score submissions payload detec');

    // Check player exists
    const exists = await this.playerService.getById(playerId);
    if (!exists) throw new BadRequestException('Player does not exist');

    // Submit score and get rank
    const { totalScore, rank } = await this.leaderboardService.scoreSubmit(payload);

    // Queue async DB write
    await this.scoreQueue.add(SCORE_PROCESSOR_SAVE_SCORE, { ...payload, totalScore });

    return { playerId, submittedScore: score, totalScore, rank };
  }

  private async detectImpossibleJumps(score: TScoreSubmitPayload) {
    const { level, timespent } = score.metadata;

    if (timespent < SCORE_TIMESPENT_MIN || level < 0) return true;

    const lastScore = await this.scoreRepository.findOne({
      where: { playerId: score.playerId },
      order: { createdAt: 'DESC' },
    });

    if (!lastScore) return level !== 1;

    const lastLevel = lastScore.metadata?.level;
    if (typeof lastLevel !== 'number') return true;

    if (level - lastLevel > SCORE_IMPOSSIBLE_JUMP_LEVEL || level - lastLevel <= 0) return true;

    return false;
  }

  private async checkRateLimitSliding(playerId: string) {
    const key = `${SCORE_SUBMISSION_RATE_LIMIT_KEY}${playerId}`;
    const now = Date.now();

    // Remove submissions older than 60s
    await this.redis.zremrangebyscore(key, 0, now - 60_000);

    const count = await this.redis.zcard(key);
    if (count >= SCORE_MAX_SUBMISSIONS_PER_MINUTE) {
      throw new TooManyRequestsException(
        `Rate limit exceeded. Max ${SCORE_MAX_SUBMISSIONS_PER_MINUTE} submissions per minute per player`,
      );
    }

    await this.redis.zadd(key, now, `${now}`);
    await this.redis.expire(key, 61);
  }
}
