import { Test, TestingModule } from '@nestjs/testing';
import { PlayerService } from './player.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlayerEntity } from './player.entity';
import { CacheService } from '../cache/cache.service';
import { NotFoundException } from '@nestjs/common';

describe('PlayerService', () => {
  let service: PlayerService;
  let mockPlayerRepository: Record<string, jest.Mock>;
  let mockCacheService: Record<string, jest.Mock>;

  const mockPlayer: PlayerEntity = {
    id: 'player_123',
    wallet: '0x742d35cc6634c0532925a3b844bc9e7595f0beb',
    totalScore: 15000,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockPlayerRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        {
          provide: getRepositoryToken(PlayerEntity),
          useValue: mockPlayerRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateByWallet', () => {
    const wallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

    it('should return cached player when exists in cache', async () => {
      mockCacheService.get.mockResolvedValue(mockPlayer);

      const result = await service.getOrCreateByWallet(wallet);

      expect(result).toEqual(mockPlayer);
      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockPlayerRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return player from DB when not in cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(mockPlayer);

      const result = await service.getOrCreateByWallet(wallet);

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerRepository.findOne).toHaveBeenCalledWith({
        where: { wallet: wallet.toLowerCase().trim() },
      });
    });

    it('should create new player when not exists in DB', async () => {
      const newPlayer = { ...mockPlayer, id: 'new_player_id' };
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(null);
      mockPlayerRepository.create.mockReturnValue(newPlayer);
      mockPlayerRepository.save.mockResolvedValue(newPlayer);

      const result = await service.getOrCreateByWallet(wallet);

      expect(result).toEqual(newPlayer);
      expect(mockPlayerRepository.create).toHaveBeenCalledWith({
        wallet: wallet.toLowerCase(),
        totalScore: 0,
      });
      expect(mockPlayerRepository.save).toHaveBeenCalled();
    });

    it('should cache newly created player', async () => {
      const newPlayer = { ...mockPlayer, id: 'new_player_id' };
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(null);
      mockPlayerRepository.create.mockReturnValue(newPlayer);
      mockPlayerRepository.save.mockResolvedValue(newPlayer);

      await service.getOrCreateByWallet(wallet);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(wallet),
        newPlayer,
        expect.any(Object),
      );
    });

    it('should normalize wallet address to lowercase', async () => {
      const mixedCaseWallet = '0x742D35Cc6634C0532925a3B844Bc9e7595f0bEb';
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(null);
      mockPlayerRepository.create.mockReturnValue(mockPlayer);
      mockPlayerRepository.save.mockResolvedValue(mockPlayer);

      await service.getOrCreateByWallet(mixedCaseWallet);

      expect(mockPlayerRepository.create).toHaveBeenCalledWith({
        wallet: mixedCaseWallet.toLowerCase(),
        totalScore: 0,
      });
    });
  });

  describe('getById', () => {
    it('should return cached player when exists in cache', async () => {
      mockCacheService.get.mockResolvedValue(mockPlayer);

      const result = await service.getById('player_123');

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return player from DB when not in cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(mockPlayer);

      const result = await service.getById('player_123');

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'player_123' },
      });
    });

    it('should cache player when found in DB', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(mockPlayer);

      await service.getById('player_123');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('player_123'),
        mockPlayer,
        expect.any(Object),
      );
    });

    it('should return null when player not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(null);

      const result = await service.getById('nonexistent_player');

      expect(result).toBeNull();
    });

    it('should not cache when player not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(null);

      await service.getById('nonexistent_player');

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('updateTotalScore', () => {
    it('should update player total score in DB', async () => {
      mockCacheService.get.mockResolvedValue(mockPlayer);
      mockPlayerRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateTotalScore('player_123', 20000);

      expect(mockPlayerRepository.update).toHaveBeenCalledWith(
        'player_123',
        expect.objectContaining({ totalScore: 20000 }),
      );
    });

    it('should refresh cache after update', async () => {
      mockCacheService.get.mockResolvedValue(mockPlayer);
      mockPlayerRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateTotalScore('player_123', 20000);

      expect(mockCacheService.set).toHaveBeenCalledTimes(2); // wallet key and id key
    });

    it('should throw NotFoundException when player not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPlayerRepository.findOne.mockResolvedValue(null);

      await expect(service.updateTotalScore('nonexistent', 20000)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return updated total score', async () => {
      mockCacheService.get.mockResolvedValue(mockPlayer);
      mockPlayerRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateTotalScore('player_123', 20000);

      expect(result).toBe(20000);
    });
  });
});
