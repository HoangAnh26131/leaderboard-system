import { Test, TestingModule } from '@nestjs/testing';
import { ScoreProcessor } from './score.processor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScoreEntity } from './score.entity';
import { PlayerService } from '../player/player.service';
import { TScoreProcessorSaveScorePayload } from './score.types';

// Mock Job interface for testing
interface MockJob<T> {
  data: T;
}

describe('ScoreProcessor', () => {
  let processor: ScoreProcessor;
  let mockScoreRepository: Record<string, jest.Mock>;
  let mockPlayerService: Record<string, jest.Mock>;

  const mockJobData: TScoreProcessorSaveScorePayload = {
    playerId: 'player_123',
    score: 15000,
    metadata: { level: 5, timeSpent: 120 },
    timestamp: new Date('2024-01-15T10:30:00Z'),
    totalScore: 15000,
  };

  beforeEach(async () => {
    mockScoreRepository = {
      save: jest.fn().mockResolvedValue({ id: 'score_id', ...mockJobData }),
    };

    mockPlayerService = {
      updateTotalScore: jest.fn().mockResolvedValue(15000),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreProcessor,
        {
          provide: getRepositoryToken(ScoreEntity),
          useValue: mockScoreRepository,
        },
        {
          provide: PlayerService,
          useValue: mockPlayerService,
        },
      ],
    }).compile();

    processor = module.get<ScoreProcessor>(ScoreProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSaveScore', () => {
    it('should save score to database', async () => {
      const mockJob: MockJob<TScoreProcessorSaveScorePayload> = { data: mockJobData };

      await processor.handleSaveScore(mockJob as any);

      expect(mockScoreRepository.save).toHaveBeenCalledWith(mockJobData);
    });

    it('should update player total score', async () => {
      const mockJob: MockJob<TScoreProcessorSaveScorePayload> = { data: mockJobData };

      await processor.handleSaveScore(mockJob as any);

      expect(mockPlayerService.updateTotalScore).toHaveBeenCalledWith('player_123', 15000);
    });

    it('should process job data correctly', async () => {
      const customJobData = {
        ...mockJobData,
        score: 25000,
        totalScore: 40000,
      };
      const mockJob: MockJob<TScoreProcessorSaveScorePayload> = { data: customJobData };

      await processor.handleSaveScore(mockJob as any);

      expect(mockScoreRepository.save).toHaveBeenCalledWith(customJobData);
      expect(mockPlayerService.updateTotalScore).toHaveBeenCalledWith('player_123', 40000);
    });

    it('should throw error when save fails', async () => {
      mockScoreRepository.save.mockRejectedValue(new Error('Database error'));
      const mockJob: MockJob<TScoreProcessorSaveScorePayload> = { data: mockJobData };

      await expect(processor.handleSaveScore(mockJob as any)).rejects.toThrow('Database error');
    });

    it('should throw error when updateTotalScore fails', async () => {
      mockPlayerService.updateTotalScore.mockRejectedValue(new Error('Update error'));
      const mockJob: MockJob<TScoreProcessorSaveScorePayload> = { data: mockJobData };

      await expect(processor.handleSaveScore(mockJob as any)).rejects.toThrow('Update error');
    });

    it('should handle metadata correctly', async () => {
      const jobWithMetadata = {
        ...mockJobData,
        metadata: { level: 10, character: 'mage', time: 300 },
      };
      const mockJob: MockJob<TScoreProcessorSaveScorePayload> = { data: jobWithMetadata };

      await processor.handleSaveScore(mockJob as any);

      expect(mockScoreRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { level: 10, character: 'mage', time: 300 },
        }),
      );
    });
  });
});
