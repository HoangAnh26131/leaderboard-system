import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CACHE_CLIENT } from '../cache/cache.constant';
import { ETimeframe, TLeaderboardRecords, TLeaderboardRetrievalPayload } from './leaderboard.type';
import {
  BATCH_LEADERBOARD_INSERT_SIZE,
  LEADERBOARD_ALLTIME_KEY,
  LEADERBOARD_CACHE_TTL,
  LEADERBOARD_PLAYER_KEY,
  LEADERBOARD_PLAYER_LIMIT,
  LEADERBOARD_PLAYER_RANK_SURROUND,
  LEADERBOARD_RETRIEVAL_LIMIT_MAX,
} from './leaderboard.constant';
import { InjectRepository } from '@nestjs/typeorm';
import { ScoreEntity } from '../score/score.entity';
import { MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { TScoreSubmitPayload } from '../score/score.types';
import { PlayerEntity } from '../player/player.entity';
import { ATOMIC_SCORE_UPDATE } from './leaderboard.lua';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @Inject(CACHE_CLIENT) private readonly redis: Redis,
    @InjectRepository(ScoreEntity)
    private readonly scoreRepository: Repository<ScoreEntity>,
    @InjectRepository(PlayerEntity)
    private readonly playerRepository: Repository<PlayerEntity>,
  ) {}

  /**
   * Get leaderboard with caching
   */
  async getLeaderboard(payload: TLeaderboardRetrievalPayload) {
    const startTime = Date.now();
    const { timeframe, limit, offset, playerId } = payload;

    const validatedLimit = Math.min(Math.max(1, limit), LEADERBOARD_RETRIEVAL_LIMIT_MAX);

    // Try cache first (only for non-filtered requests)
    if (!playerId) {
      const cached = await this.getFromCache(timeframe, validatedLimit, offset);
      if (cached) {
        this.logPerformance('getLeaderboard (cached)', startTime);
        return cached;
      }
    }

    const { start, end } = this.getTimeRange(timeframe);

    /* Base sql and params */
    const { whereSql, baseParams } = this.leaderboardBaseSql(end, playerId, start);

    /* Sum of player scores */
    const page = await this.leaderboardPage(whereSql, baseParams, validatedLimit, offset);

    /* Items counts */
    const total = await this.leaderboardCount(end, start);

    if (page.length === 0) {
      const emptyResult = {
        items: [],
        total: Number(total),
        limit: validatedLimit,
        offset,
      };
      this.logPerformance('getLeaderboard', startTime);
      return emptyResult;
    }

    /* Rank map */
    const rankMap = await this.leaderboardRank(end, page, start);

    const result = {
      items: page.map(p => ({
        playerId: p.playerId,
        totalScore: Number(p.totalScore),
        rank: rankMap.get(p.playerId) ?? 1,
      })),
      total,
      limit: validatedLimit,
      offset,
    };

    // Cache result for non-filtered requests
    if (!playerId) {
      await this.setCache(timeframe, validatedLimit, offset, result);
    }

    this.logPerformance('getLeaderboard', startTime);
    return result;
  }

  /**
   * Get cached leaderboard
   */
  private async getFromCache(timeframe: ETimeframe, limit: number, offset: number) {
    const cacheKey = `leaderboard:cache:${timeframe}:${limit}:${offset}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  /**
   * Set leaderboard cache
   */
  private async setCache(timeframe: ETimeframe, limit: number, offset: number, data: unknown) {
    const cacheKey = `leaderboard:cache:${timeframe}:${limit}:${offset}`;
    await this.redis.setex(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(data));
  }

  /**
   * Log performance metrics
   */
  private logPerformance(operation: string, startTime: number) {
    const duration = Date.now() - startTime;
    if (duration > 100) {
      this.logger.warn(`${operation} took ${duration}ms (exceeds 100ms threshold)`);
    } else {
      this.logger.debug(`${operation} completed in ${duration}ms`);
    }
  }

  private leaderboardBaseSql(end: Date, playerId: string, start?: Date) {
    const safePlayerId = this.escapeLike(playerId);

    const whereSql = `
      s.createdAt <= ?
      AND s.playerId LIKE ?
      ${start ? 'AND s.createdAt >= ?' : ''}
    `;

    const baseParams: unknown[] = [end, `%${safePlayerId}%`];
    if (start) baseParams.push(start);

    return { whereSql, baseParams };
  }

  private escapeLike(str: string) {
    return str.replace(/[\\%_]/g, '\\$&');
  }

  private async leaderboardCount(end: Date, start?: Date) {
    const countSql = `
      SELECT COUNT(DISTINCT s.playerId) AS total
      FROM scores s
      WHERE s.createdAt <= ?
        ${start ? 'AND s.createdAt >= ?' : ''}
    `;

    const countParams: unknown[] = [end];
    if (start) countParams.push(start);

    const [{ total }] = await this.scoreRepository.query(countSql, countParams);

    return Number(total);
  }

  private async leaderboardPage(
    whereSql: string,
    baseParams: unknown[],
    limit: number,
    offset: number,
  ) {
    const pageSql = `
      SELECT
        t.playerId,
        t.totalScore
      FROM (
        SELECT
          s.playerId,
          SUM(s.score) AS totalScore
        FROM scores s
        WHERE ${whereSql}
        GROUP BY s.playerId
      ) t
      ORDER BY t.totalScore DESC
      LIMIT ? OFFSET ?
    `;

    const page = await this.scoreRepository.query<TLeaderboardRecords[]>(pageSql, [
      ...baseParams,
      limit,
      offset,
    ]);

    return page;
  }

  private async leaderboardRank(end: Date, page: TLeaderboardRecords[], start?: Date) {
    const rankSql = `
      SELECT
        p.playerId,
        COUNT(*) + 1 AS \`rank\`
      FROM (
        SELECT
          s.playerId,
          SUM(s.score) AS totalScore
        FROM scores s
        WHERE s.createdAt <= ?
          ${start ? 'AND s.createdAt >= ?' : ''}
        GROUP BY s.playerId
      ) allp
      JOIN (
        SELECT
          s.playerId,
          SUM(s.score) AS totalScore
        FROM scores s
        WHERE s.createdAt <= ?
          ${start ? 'AND s.createdAt >= ?' : ''}
          AND s.playerId IN (?)
        GROUP BY s.playerId
      ) p
        ON allp.totalScore > p.totalScore
      GROUP BY p.playerId
    `;

    const rankParams: unknown[] = [end];
    if (start) rankParams.push(start);

    rankParams.push(end);
    if (start) rankParams.push(start);

    rankParams.push(page.map(p => p.playerId));

    const ranks = await this.scoreRepository.query<TLeaderboardRecords[]>(rankSql, rankParams);
    const rankMap = new Map(ranks.map(r => [r.playerId, Number(r.rank)]));

    return rankMap;
  }

  /**
   * Player rank API
   */
  async getPlayerRankAndSurround(playerId: string, timeframe: ETimeframe) {
    const player = await this.getPlayerRank(playerId, timeframe);

    const above = await this.getPlayerSurround(
      player,
      timeframe,
      LEADERBOARD_PLAYER_RANK_SURROUND,
      'above',
    );
    const below = await this.getPlayerSurround(
      player,
      timeframe,
      LEADERBOARD_PLAYER_RANK_SURROUND,
      'below',
    );

    return {
      player,
      surrounding: {
        above,
        below,
      },
    };
  }

  private async getPlayerRank(
    playerId: string,
    timeframe: ETimeframe,
  ): Promise<{ playerId: string; totalScore: number; rank: number }> {
    const { start, end } = this.getTimeRange(timeframe);

    const playerSql = `
      SELECT
        s.playerId,
        SUM(s.score) AS totalScore
      FROM scores s
      WHERE s.playerId = ?
        AND s.createdAt <= ?
        AND (? IS NULL OR s.createdAt >= ?)
      GROUP BY s.playerId
    `;

    const playerRows = await this.scoreRepository.query(playerSql, [
      playerId,
      end,
      start ?? null,
      start ?? null,
    ]);

    const totalScore = Number(playerRows[0]?.totalScore ?? 0);

    const rankSql = `
      SELECT COUNT(*) + 1 AS \`rank\`
      FROM (
        SELECT
          SUM(s2.score) AS totalScore
        FROM scores s2
        WHERE s2.createdAt <= ?
          AND (? IS NULL OR s2.createdAt >= ?)
        GROUP BY s2.playerId
      ) all_players
      WHERE all_players.totalScore > ?
    `;

    const [{ rank }] = await this.scoreRepository.query(rankSql, [
      end,
      start ?? null,
      start ?? null,
      totalScore,
    ]);

    return {
      playerId,
      totalScore,
      rank: Number(rank),
    };
  }

  private async getPlayerSurround(
    player: { playerId: string; totalScore: number; rank: number },
    timeframe: ETimeframe,
    surround: number,
    side: 'above' | 'below',
  ) {
    const { start, end } = this.getTimeRange(timeframe);

    const aroundSql = `
    SELECT
      s.playerId,
      SUM(s.score) AS totalScore
    FROM scores s
    WHERE s.createdAt <= ?
      AND (? IS NULL OR s.createdAt >= ?)
      AND s.playerId != ?
    GROUP BY s.playerId
    HAVING totalScore ${side === 'above' ? '>' : '<'} ?
    ORDER BY totalScore ASC
    LIMIT ?
  `;

    const aroundRaw: Array<Omit<TLeaderboardRecords, 'total' | 'rank'>> =
      await this.scoreRepository.query(aroundSql, [
        end,
        start ?? null,
        start ?? null,
        player.playerId,
        player.totalScore,
        surround,
      ]);

    return aroundRaw.map((p, index) => ({
      playerId: p.playerId,
      totalScore: Number(p.totalScore),
      rank: side === 'above' ? player.rank - (aroundRaw.length - index) : player.rank + index + 1,
    }));
  }

  /**
   * Score submit with atomic Lua script
   */
  async scoreSubmit(payload: TScoreSubmitPayload) {
    const startTime = Date.now();
    const { playerId, score } = payload;
    const playerScoreKey = `${LEADERBOARD_PLAYER_KEY}${playerId}`;

    // Use Lua script for atomic update
    const result = (await this.redis.eval(
      ATOMIC_SCORE_UPDATE,
      2,
      playerScoreKey,
      LEADERBOARD_ALLTIME_KEY,
      playerId,
      score.toString(),
      LEADERBOARD_PLAYER_LIMIT.toString(),
    )) as [number, number];

    const [newTotalScore, rank] = result;

    // Invalidate cache after score update
    await this.invalidateLeaderboardCache();

    this.logPerformance('scoreSubmit', startTime);

    // If rank is -1, player is not in leaderboard, get from DB
    if (rank === 0) {
      const dbRank = await this.getPlayerRankFromDb(newTotalScore);
      return { totalScore: newTotalScore, rank: dbRank };
    }

    return { totalScore: newTotalScore, rank };
  }

  /**
   * Invalidate leaderboard cache after score update
   */
  private async invalidateLeaderboardCache() {
    const keys = await this.redis.keys('leaderboard:cache:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async getPlayerRankFromDb(totalScore: number): Promise<number> {
    const count = await this.playerRepository.count({
      where: { totalScore: MoreThan(totalScore) },
    });

    return count + 1;
  }

  async onModuleInit() {
    await this.rebuildLeaderboard();
  }

  private async rebuildLeaderboard() {
    const topPlayers = await this.getTopNPlayer(LEADERBOARD_PLAYER_LIMIT);
    if (topPlayers.length === 0) return;

    const batchSize = BATCH_LEADERBOARD_INSERT_SIZE;

    for (let i = 0; i < topPlayers.length; i += batchSize) {
      const batch = topPlayers.slice(i, i + batchSize);
      const pipeline = this.redis.pipeline();

      for (const player of batch) {
        const score = Number(player.totalScore);

        const playerScoreKey = `${LEADERBOARD_PLAYER_KEY}${player.id}`;

        pipeline.zadd(LEADERBOARD_ALLTIME_KEY, score, player.id);
        pipeline.hset(playerScoreKey, player.id, score);
      }

      await pipeline.exec();
    }
  }

  private async getTopNPlayer(n: number): Promise<PlayerEntity[]> {
    return this.playerRepository.find({
      select: ['id', 'totalScore'],
      where: { totalScore: MoreThanOrEqual(0) },
      order: { totalScore: 'DESC' },
      take: n,
    });
  }

  private getTimeRange(timeframe: ETimeframe) {
    const now = new Date();
    let start: Date | undefined;

    switch (timeframe) {
      case ETimeframe.DAILY:
        start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        break;
      case ETimeframe.WEEKLY:
        const day = now.getUTCDay(); // 0=Sunday
        start = new Date(now);
        start.setUTCDate(now.getUTCDate() - day);
        start.setUTCHours(0, 0, 0, 0);
        break;
      case ETimeframe.MONTHLY:
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        break;
      case ETimeframe.ALLTIME:
        start = undefined;
        break;
    }

    return { start, end: now };
  }
}
