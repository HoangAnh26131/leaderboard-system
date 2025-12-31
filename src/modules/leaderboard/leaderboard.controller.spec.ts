import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TAuthRequest } from '../../common/types/request';
import { ETimeframe } from './leaderboard.type';

describe('LeaderboardController', () => {
  let controller: LeaderboardController;
  let mockLeaderboardService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockLeaderboardService = {
      getLeaderboard: jest.fn().mockResolvedValue({
        items: [
          { playerId: 'player_1', totalScore: 50000, rank: 1 },
          { playerId: 'player_2', totalScore: 40000, rank: 2 },
        ],
        total: 100,
        limit: 10,
        offset: 0,
      }),
      getPlayerRankAndSurround: jest.fn().mockResolvedValue({
        player: { playerId: 'player_123', totalScore: 30000, rank: 5 },
        surrounding: {
          above: [{ playerId: 'player_4', totalScore: 35000, rank: 4 }],
          below: [{ playerId: 'player_6', totalScore: 25000, rank: 6 }],
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaderboardController],
      providers: [
        {
          provide: LeaderboardService,
          useValue: mockLeaderboardService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LeaderboardController>(LeaderboardController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard data', async () => {
      const query = {
        timeframe: ETimeframe.ALLTIME,
        limit: 10,
        offset: 0,
        playerId: '',
      };

      const result = await controller.getLeaderboard(query);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(100);
    });

    it('should call service with correct parameters', async () => {
      const query = {
        timeframe: ETimeframe.DAILY,
        limit: 50,
        offset: 10,
        playerId: 'player_123',
      };

      await controller.getLeaderboard(query);

      expect(mockLeaderboardService.getLeaderboard).toHaveBeenCalledWith(query);
    });

    it('should handle different timeframes', async () => {
      const timeframes = [ETimeframe.DAILY, ETimeframe.WEEKLY, ETimeframe.MONTHLY, ETimeframe.ALLTIME];

      for (const timeframe of timeframes) {
        await controller.getLeaderboard({
          timeframe,
          limit: 100,
          offset: 0,
          playerId: '',
        });
      }

      expect(mockLeaderboardService.getLeaderboard).toHaveBeenCalledTimes(4);
    });
  });

  describe('getPlayerRank', () => {
    const mockRequest = {
      user: { playerId: 'player_123', wallet: '0x123' },
    } as TAuthRequest;

    it('should return player rank with surrounding players', async () => {
      const query = { timeframe: ETimeframe.ALLTIME };

      const result = await controller.getPlayerRank(query, mockRequest);

      expect(result.player.playerId).toBe('player_123');
      expect(result.player.rank).toBe(5);
      expect(result.surrounding.above).toHaveLength(1);
      expect(result.surrounding.below).toHaveLength(1);
    });

    it('should call service with playerId from request', async () => {
      const query = { timeframe: ETimeframe.WEEKLY };

      await controller.getPlayerRank(query, mockRequest);

      expect(mockLeaderboardService.getPlayerRankAndSurround).toHaveBeenCalledWith(
        'player_123',
        ETimeframe.WEEKLY,
      );
    });

    it('should use different player from request', async () => {
      const differentRequest = {
        user: { playerId: 'another_player', wallet: '0x456' },
      } as TAuthRequest;
      const query = { timeframe: ETimeframe.MONTHLY };

      await controller.getPlayerRank(query, differentRequest);

      expect(mockLeaderboardService.getPlayerRankAndSurround).toHaveBeenCalledWith(
        'another_player',
        ETimeframe.MONTHLY,
      );
    });
  });
});
