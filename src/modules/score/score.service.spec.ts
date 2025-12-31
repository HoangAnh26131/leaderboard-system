import { Test, TestingModule } from '@nestjs/testing';
import { ScoreService } from './score.service';
import { PlayerService } from '../player/player.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScoreEntity } from './score.entity';
import { getQueueToken } from '@nestjs/bull';
import { CACHE_CLIENT } from '../cache/cache.constant';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SCORE_QUEUE } from './score.constant';

describe('ScoreService', () => {
  let service: ScoreService;
  let mockRedis: Record<string, jest.Mock>;
  let mockScoreRepository: Record<string, jest.Mock>;
  let mockScoreQueue: Record<string, jest.Mock>;
  let mockPlayerService: Record<string, jest.Mock>;
  let mockLeaderboardService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRedis = {
      zremrangebyscore: jest.fn().mockResolvedValue(0),
      zcard: jest.fn().mockResolvedValue(0),
      zadd: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    mockScoreRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };

    mockScoreQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    mockPlayerService = {
      getById: jest.fn().mockResolvedValue({ id: 'player_123', wallet: '0x123', totalScore: 0 }),
    };

    mockLeaderboardService = {
      scoreSubmit: jest.fn().mockResolvedValue({ totalScore: 15000, rank: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreService,
        {
          provide: CACHE_CLIENT,
          useValue: mockRedis,
        },
        {
          provide: getRepositoryToken(ScoreEntity),
          useValue: mockScoreRepository,
        },
        {
          provide: getQueueToken(SCORE_QUEUE),
          useValue: mockScoreQueue,
        },
        {
          provide: PlayerService,
          useValue: mockPlayerService,
        },
        {
          provide: LeaderboardService,
          useValue: mockLeaderboardService,
        },
      ],
    }).compile();

    service = module.get<ScoreService>(ScoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submit', () => {
    const validPayload = {
      playerId: 'player_123',
      score: 15000,
      metadata: { level: 5, timeSpent: 120 },
      timestamp: new Date('2024-01-15T10:30:00Z'),
    };

    it('should successfully submit a score', async () => {
      const result = await service.submit('player_123', { ...validPayload });

      expect(result).toEqual({
        playerId: 'player_123',
        submittedScore: 15000,
        totalScore: 15000,
        rank: 1,
      });
      expect(mockLeaderboardService.scoreSubmit).toHaveBeenCalled();
      expect(mockScoreQueue.add).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when playerId does not match request user', async () => {
      await expect(service.submit('different_player', { ...validPayload })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when player does not exist', async () => {
      mockPlayerService.getById.mockResolvedValue(null);

      await expect(service.submit('player_123', { ...validPayload })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPlayerService.getById).toHaveBeenCalledWith('player_123');
    });

    it('should throw BadRequestException when timestamp already exists', async () => {
      mockScoreRepository.findOne.mockResolvedValue({ id: 'existing_score' });

      await expect(service.submit('player_123', { ...validPayload })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should queue async DB write after successful submission', async () => {
      await service.submit('player_123', { ...validPayload });

      expect(mockScoreQueue.add).toHaveBeenCalledWith(
        'save_score',
        expect.objectContaining({
          playerId: 'player_123',
          score: 15000,
          totalScore: 15000,
        }),
      );
    });
  });

  describe('checkRateLimitSliding', () => {
    const payload = {
      playerId: 'player_123',
      score: 1000,
      metadata: {},
      timestamp: new Date(),
    };

    it('should allow submission when under rate limit', async () => {
      mockRedis.zcard.mockResolvedValue(5);

      await expect(service.submit('player_123', { ...payload })).resolves.toBeDefined();
    });

    it('should throw BadRequestException when rate limit exceeded', async () => {
      mockRedis.zcard.mockResolvedValue(10);

      await expect(service.submit('player_123', { ...payload })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submit('player_123', { ...payload })).rejects.toThrow(
        'Rate limit exceeded',
      );
    });

    it('should remove old entries before checking rate limit', async () => {
      mockRedis.zcard.mockResolvedValue(5);

      await service.submit('player_123', { ...payload });

      expect(mockRedis.zremrangebyscore).toHaveBeenCalled();
    });

    it('should add new timestamp to rate limit set', async () => {
      mockRedis.zcard.mockResolvedValue(5);

      await service.submit('player_123', { ...payload });

      expect(mockRedis.zadd).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 61);
    });
  });
});
