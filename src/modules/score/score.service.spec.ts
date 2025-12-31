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
import { TooManyRequestsException } from '../../common/exceptions/too-many-request.exception';

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
      metadata: { level: 1, timespent: 100 },
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
      metadata: { level: 1, timespent: 100 },
      timestamp: new Date(),
    };

    it('should allow submission when under rate limit', async () => {
      mockRedis.zcard.mockResolvedValue(5);

      await expect(service.submit('player_123', { ...payload })).resolves.toBeDefined();
    });

    it('should throw TooManyRequestsException when rate limit exceeded', async () => {
      mockRedis.zcard.mockResolvedValue(10);

      await expect(service.submit('player_123', { ...payload })).rejects.toThrow(
        TooManyRequestsException,
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

  describe('detectImpossibleJumps', () => {
    const basePayload = {
      playerId: 'player_123',
      score: 1000,
      timestamp: new Date(),
    };

    beforeEach(() => {
      mockRedis.zcard.mockResolvedValue(0);
      mockPlayerService.getById.mockResolvedValue({ id: 'player_123' });
    });

    it('should reject score with timespent below minimum', async () => {
      const payloadWithLowTimespent = {
        ...basePayload,
        metadata: { timespent: 0.5, level: 1 },
      };

      await expect(service.submit('player_123', payloadWithLowTimespent)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject score with negative level', async () => {
      const payloadWithNegativeLevel = {
        ...basePayload,
        metadata: { level: -1, timespent: 10 },
      };

      await expect(service.submit('player_123', payloadWithNegativeLevel)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject first score that is not level 1', async () => {
      // No previous score exists
      mockScoreRepository.findOne.mockResolvedValue(null);

      const payloadWithLevel5 = {
        ...basePayload,
        metadata: { level: 5, timespent: 10 },
      };

      await expect(service.submit('player_123', payloadWithLevel5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow first score at level 1', async () => {
      // First call: detectImpossibleJumps - no previous score
      // Second call: timestamp check - no duplicate
      mockScoreRepository.findOne
        .mockResolvedValueOnce(null) // for detectImpossibleJumps
        .mockResolvedValueOnce(null); // for timestamp check

      const payloadWithLevel1 = {
        ...basePayload,
        metadata: { level: 1, timespent: 10 },
      };

      await expect(service.submit('player_123', payloadWithLevel1)).resolves.toBeDefined();
    });

    it('should reject when last score has no level metadata', async () => {
      // Previous score exists but has no level
      mockScoreRepository.findOne.mockResolvedValue({ metadata: {} });

      const payloadWithLevel2 = {
        ...basePayload,
        metadata: { level: 2, timespent: 10 },
      };

      await expect(service.submit('player_123', payloadWithLevel2)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when level jump is too large', async () => {
      // Previous score at level 1
      mockScoreRepository.findOne.mockResolvedValue({ metadata: { level: 1 } });

      const payloadWithLevel10 = {
        ...basePayload,
        metadata: { level: 10, timespent: 10 },
      };

      await expect(service.submit('player_123', payloadWithLevel10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when level is same or decreasing', async () => {
      // Previous score at level 3
      mockScoreRepository.findOne.mockResolvedValue({ metadata: { level: 3 } });

      const payloadWithLevel2 = {
        ...basePayload,
        metadata: { level: 2, timespent: 10 },
      };

      await expect(service.submit('player_123', payloadWithLevel2)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow valid level progression', async () => {
      // First call: detectImpossibleJumps gets last score with level 1
      // Second call: timestamp check returns null (no duplicate)
      mockScoreRepository.findOne
        .mockResolvedValueOnce({ metadata: { level: 1 } }) // for detectImpossibleJumps
        .mockResolvedValueOnce(null); // for timestamp check

      const payloadWithLevel2 = {
        ...basePayload,
        metadata: { level: 2, timespent: 10 },
      };

      await expect(service.submit('player_123', payloadWithLevel2)).resolves.toBeDefined();
    });
  });
});
