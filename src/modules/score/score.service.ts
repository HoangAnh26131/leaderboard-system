import { Injectable, BadRequestException, Inject, ForbiddenException } from '@nestjs/common';
import Redis from 'ioredis';
import { PlayerService } from '../player/player.service';
import { TScoreSubmitPayload } from './score.types';
import {
  SCORE_MAX_SUBMISSIONS_PER_MINUTE,
  SCORE_PROCESSOR_SAVE_SCORE,
  SCORE_QUEUE,
  SCORE_SUBMISSION_RATE_LIMIT_KEY,
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
  constructor(
    @Inject(CACHE_CLIENT)
    private readonly redis: Redis,
    @InjectRepository(ScoreEntity)
    private readonly scoreRepository: Repository<ScoreEntity>,
    @InjectQueue(SCORE_QUEUE) private readonly scoreQueue: Queue,
    private readonly playerService: PlayerService,
    private readonly leaderboardervice: LeaderboardService,
  ) {}

  async submit(playerRequestId: string, payload: TScoreSubmitPayload) {
    payload.timestamp = new Date();

    const { playerId, score, timestamp } = payload;

    if (playerRequestId !== playerId) throw new ForbiddenException('Player is not allowed');

    // Rate limit per player
    await this.checkRateLimitSliding(playerId);

    const isExistTimestamp = await this.scoreRepository.findOne({ where: { playerId, timestamp } });
    if (isExistTimestamp) throw new BadRequestException('Timestamp already exists');

    // Check player exists
    const exists = await this.playerService.getById(playerId);
    if (!exists) throw new BadRequestException('Player does not exist');

    // Submit score and get rank
    const { totalScore, rank } = await this.leaderboardervice.scoreSubmit(payload);

    // Queue async DB write
    await this.scoreQueue.add(SCORE_PROCESSOR_SAVE_SCORE, { ...payload, totalScore });

    return { playerId, submittedScore: score, totalScore, rank };
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
