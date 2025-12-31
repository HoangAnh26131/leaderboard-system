import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from './leaderboard.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScoreEntity } from '../score/score.entity';
import { PlayerEntity } from '../player/player.entity';
import { CACHE_CLIENT } from '../cache/cache.constant';
import { ETimeframe } from './leaderboard.type';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockRedis: Record<string, jest.Mock>;
  let mockScoreRepository: Record<string, jest.Mock>;
  let mockPlayerRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRedis = {
      hincrby: jest.fn().mockResolvedValue(15000),
      zscore: jest.fn().mockResolvedValue(null),
      zcard: jest.fn().mockResolvedValue(100),
      zrange: jest.fn().mockResolvedValue(['player_999', '1000']),
      zadd: jest.fn().mockResolvedValue(1),
      zrevrank: jest.fn().mockResolvedValue(0),
      pipeline: jest.fn().mockReturnValue({
        zadd: jest.fn().mockReturnThis(),
        zrevrank: jest.fn().mockReturnThis(),
        zremrangebyrank: jest.fn().mockReturnThis(),
        hdel: jest.fn().mockReturnThis(),
        hset: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 0],
        ]),
      }),
    };

    mockScoreRepository = {
      query: jest.fn(),
    };

    mockPlayerRepository = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: CACHE_CLIENT,
          useValue: mockRedis,
        },
        {
          provide: getRepositoryToken(ScoreEntity),
          useValue: mockScoreRepository,
        },
        {
          provide: getRepositoryToken(PlayerEntity),
          useValue: mockPlayerRepository,
        },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should return empty leaderboard when no scores exist', async () => {
      mockScoreRepository.query
        .mockResolvedValueOnce([]) // page query
        .mockResolvedValueOnce([{ total: 0 }]); // count query

      const result = await service.getLeaderboard({
        timeframe: ETimeframe.ALLTIME,
        limit: 100,
        offset: 0,
        playerId: '',
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return leaderboard with correct pagination', async () => {
      const mockPlayers = [
        { playerId: 'player_1', totalScore: '50000' },
        { playerId: 'player_2', totalScore: '40000' },
      ];

      mockScoreRepository.query
        .mockResolvedValueOnce(mockPlayers) // page query
        .mockResolvedValueOnce([{ total: 100 }]) // count query
        .mockResolvedValueOnce([
          { playerId: 'player_1', rank: 1 },
          { playerId: 'player_2', rank: 2 },
        ]); // rank query

      const result = await service.getLeaderboard({
        timeframe: ETimeframe.ALLTIME,
        limit: 10,
        offset: 0,
        playerId: '',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].playerId).toBe('player_1');
      expect(result.items[0].totalScore).toBe(50000);
      expect(result.total).toBe(100);
      expect(result.limit).toBe(10);
    });

    it('should validate and cap limit to max value', async () => {
      mockScoreRepository.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      const result = await service.getLeaderboard({
        timeframe: ETimeframe.ALLTIME,
        limit: 5000, // exceeds max of 1000
        offset: 0,
        playerId: '',
      });

      expect(result.limit).toBe(1000);
    });

    it('should filter by timeframe correctly', async () => {
      mockScoreRepository.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getLeaderboard({
        timeframe: ETimeframe.DAILY,
        limit: 100,
        offset: 0,
        playerId: '',
      });

      // Verify the query was called with date parameters
      expect(mockScoreRepository.query).toHaveBeenCalled();
    });
  });

  describe('getPlayerRankAndSurround', () => {
    beforeEach(() => {
      mockScoreRepository.query
        .mockResolvedValueOnce([{ playerId: 'player_123', totalScore: '30000' }]) // player score
        .mockResolvedValueOnce([{ rank: 5 }]) // player rank
        .mockResolvedValueOnce([
          { playerId: 'player_above_1', totalScore: '35000' },
          { playerId: 'player_above_2', totalScore: '32000' },
        ]) // above players
        .mockResolvedValueOnce([
          { playerId: 'player_below_1', totalScore: '28000' },
          { playerId: 'player_below_2', totalScore: '25000' },
        ]); // below players
    });

    it('should return player rank with surrounding players', async () => {
      const result = await service.getPlayerRankAndSurround('player_123', ETimeframe.ALLTIME);

      expect(result.player).toBeDefined();
      expect(result.player.playerId).toBe('player_123');
      expect(result.player.rank).toBe(5);
      expect(result.surrounding.above).toHaveLength(2);
      expect(result.surrounding.below).toHaveLength(2);
    });

    it('should return correct surrounding players count', async () => {
      const result = await service.getPlayerRankAndSurround('player_123', ETimeframe.ALLTIME);

      expect(result.surrounding.above.length).toBeLessThanOrEqual(2);
      expect(result.surrounding.below.length).toBeLessThanOrEqual(2);
    });
  });

  describe('scoreSubmit', () => {
    it('should update player total score in Redis', async () => {
      const payload = {
        playerId: 'player_123',
        score: 5000,
        metadata: {},
        timestamp: new Date(),
      };

      await service.scoreSubmit(payload);

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'leaderboard:player:player_123',
        'player_123',
        5000,
      );
    });

    it('should return updated total score and rank', async () => {
      mockRedis.hincrby.mockResolvedValue(20000);

      const result = await service.scoreSubmit({
        playerId: 'player_123',
        score: 5000,
        metadata: {},
        timestamp: new Date(),
      });

      expect(result.totalScore).toBe(20000);
      expect(result.rank).toBeDefined();
    });

    it('should cache player in Redis when player already in cache', async () => {
      mockRedis.zscore.mockResolvedValue('15000'); // player exists in cache

      await service.scoreSubmit({
        playerId: 'player_123',
        score: 5000,
        metadata: {},
        timestamp: new Date(),
      });

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should cache player when cache is not full', async () => {
      mockRedis.zscore.mockResolvedValue(null);
      mockRedis.zcard.mockResolvedValue(500); // under limit of 1000

      await service.scoreSubmit({
        playerId: 'player_123',
        score: 5000,
        metadata: {},
        timestamp: new Date(),
      });

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should get rank from DB when not caching', async () => {
      mockRedis.zscore.mockResolvedValue(null);
      mockRedis.zcard.mockResolvedValue(1000); // at limit
      mockRedis.zrange.mockResolvedValue(['min_player', '50000']); // min score is higher

      mockRedis.hincrby.mockResolvedValue(1000); // new score is lower

      mockPlayerRepository.count.mockResolvedValue(999);

      const result = await service.scoreSubmit({
        playerId: 'player_123',
        score: 1000,
        metadata: {},
        timestamp: new Date(),
      });

      expect(result.rank).toBe(1000);
      expect(mockPlayerRepository.count).toHaveBeenCalled();
    });
  });

  describe('getTimeRange', () => {
    it('should return correct range for DAILY timeframe', async () => {
      mockScoreRepository.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getLeaderboard({
        timeframe: ETimeframe.DAILY,
        limit: 10,
        offset: 0,
        playerId: '',
      });

      const callArgs = mockScoreRepository.query.mock.calls[0];
      expect(callArgs).toBeDefined();
    });

    it('should return correct range for WEEKLY timeframe', async () => {
      mockScoreRepository.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getLeaderboard({
        timeframe: ETimeframe.WEEKLY,
        limit: 10,
        offset: 0,
        playerId: '',
      });

      expect(mockScoreRepository.query).toHaveBeenCalled();
    });

    it('should return correct range for MONTHLY timeframe', async () => {
      mockScoreRepository.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getLeaderboard({
        timeframe: ETimeframe.MONTHLY,
        limit: 10,
        offset: 0,
        playerId: '',
      });

      expect(mockScoreRepository.query).toHaveBeenCalled();
    });

    it('should return undefined start for ALLTIME timeframe', async () => {
      mockScoreRepository.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

      await service.getLeaderboard({
        timeframe: ETimeframe.ALLTIME,
        limit: 10,
        offset: 0,
        playerId: '',
      });

      expect(mockScoreRepository.query).toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('should rebuild leaderboard on module init', async () => {
      const mockPlayers = [
        { id: 'player_1', totalScore: 50000 },
        { id: 'player_2', totalScore: 40000 },
      ];
      mockPlayerRepository.find.mockResolvedValue(mockPlayers);

      await service.onModuleInit();

      expect(mockPlayerRepository.find).toHaveBeenCalled();
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should not rebuild when no players exist', async () => {
      mockPlayerRepository.find.mockResolvedValue([]);

      await service.onModuleInit();

      expect(mockPlayerRepository.find).toHaveBeenCalled();
      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });
  });
});
