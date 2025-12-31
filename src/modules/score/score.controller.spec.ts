import { Test, TestingModule } from '@nestjs/testing';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { TAuthRequest } from '../../common/types/request';

describe('ScoreController', () => {
  let controller: ScoreController;
  let mockScoreService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockScoreService = {
      submit: jest.fn().mockResolvedValue({
        playerId: 'player_123',
        submittedScore: 15000,
        totalScore: 15000,
        rank: 1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScoreController],
      providers: [
        {
          provide: ScoreService,
          useValue: mockScoreService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ScoreController>(ScoreController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submit', () => {
    const mockRequest = {
      user: { playerId: 'player_123', wallet: '0x123' },
    } as TAuthRequest;

    const submitDto = {
      playerId: 'player_123',
      score: 15000,
      metadata: { level: 5, timespent: 120 },
      timestamp: new Date('2024-01-15T10:30:00Z'),
    };

    it('should submit score successfully', async () => {
      const result = await controller.submit(submitDto, mockRequest);

      expect(result).toEqual({
        playerId: 'player_123',
        submittedScore: 15000,
        totalScore: 15000,
        rank: 1,
      });
    });

    it('should call service with correct parameters', async () => {
      await controller.submit(submitDto, mockRequest);

      expect(mockScoreService.submit).toHaveBeenCalledWith('player_123', submitDto);
    });

    it('should use playerId from request user', async () => {
      const differentUserRequest = {
        user: { playerId: 'different_player', wallet: '0x456' },
      } as TAuthRequest;

      await controller.submit(submitDto, differentUserRequest);

      expect(mockScoreService.submit).toHaveBeenCalledWith('different_player', submitDto);
    });
  });
});
