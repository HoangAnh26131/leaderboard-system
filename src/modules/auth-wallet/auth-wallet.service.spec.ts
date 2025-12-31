import { Test, TestingModule } from '@nestjs/testing';
import { AuthWalletService } from './auth-wallet.service';
import { CacheService } from '../cache/cache.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlayerService } from '../player/player.service';
import { UnauthorizedException } from '@nestjs/common';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    verifyMessage: jest.fn(),
  },
}));

describe('AuthWalletService', () => {
  let service: AuthWalletService;
  let mockCacheService: Record<string, jest.Mock>;
  let mockJwtService: Record<string, jest.Mock>;
  let mockConfigService: Record<string, jest.Mock>;
  let mockPlayerService: Record<string, jest.Mock>;

  const mockWallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const mockNonce = 'a1b2c3d4e5f6g7h8';
  const mockPlayer = {
    id: 'player_123',
    wallet: mockWallet.toLowerCase(),
    totalScore: 0,
  };

  beforeEach(async () => {
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock_token'),
      verify: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          JWT_AUTH_WALLET_ACCESS_SECRET: 'access_secret',
          JWT_AUTH_WALLET_ACCESS_EXPIRES_IN: '1d',
          JWT_AUTH_WALLET_REFRESH_SECRET: 'refresh_secret',
          JWT_AUTH_WALLET_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key] || defaultValue;
      }),
    };

    mockPlayerService = {
      getOrCreateByWallet: jest.fn().mockResolvedValue(mockPlayer),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthWalletService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PlayerService,
          useValue: mockPlayerService,
        },
      ],
    }).compile();

    service = module.get<AuthWalletService>(AuthWalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestNonce', () => {
    it('should generate and cache a nonce for wallet', async () => {
      const result = await service.requestNonce(mockWallet);

      expect(result).toHaveProperty('wallet', mockWallet);
      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('duration', 100);
      expect(result).toHaveProperty('message');
      expect(result.nonce).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should cache nonce with correct TTL', async () => {
      await service.requestNonce(mockWallet);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(mockWallet.toLowerCase()),
        expect.any(String),
        { ttl: 100 },
      );
    });

    it('should return message with nonce for signing', async () => {
      const result = await service.requestNonce(mockWallet);

      expect(result.message).toContain('Sign this nonce to authenticate:');
      expect(result.message).toContain(result.nonce);
    });
  });

  describe('verify', () => {
    const mockSignature = '0x1234567890abcdef';

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(mockNonce);
      (ethers.verifyMessage as jest.Mock).mockReturnValue(mockWallet);
    });

    it('should verify signature and return authenticated response', async () => {
      const result = await service.verify(mockWallet, mockSignature);

      expect(result).toHaveProperty('wallet', mockWallet);
      expect(result).toHaveProperty('authenticated', true);
      expect(result).toHaveProperty('token');
      expect(result.token).toHaveProperty('accessToken');
      expect(result.token).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when nonce expired', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await expect(service.verify(mockWallet, mockSignature)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verify(mockWallet, mockSignature)).rejects.toThrow('Nonce expired');
    });

    it('should throw UnauthorizedException when signature is invalid', async () => {
      (ethers.verifyMessage as jest.Mock).mockReturnValue('0xDifferentWallet');

      await expect(service.verify(mockWallet, mockSignature)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verify(mockWallet, mockSignature)).rejects.toThrow('Invalid signature');
    });

    it('should delete nonce after successful verification', async () => {
      await service.verify(mockWallet, mockSignature);

      expect(mockCacheService.del).toHaveBeenCalledWith(
        expect.stringContaining(mockWallet.toLowerCase()),
      );
    });

    it('should create or get player after verification', async () => {
      await service.verify(mockWallet, mockSignature);

      expect(mockPlayerService.getOrCreateByWallet).toHaveBeenCalledWith(mockWallet);
    });

    it('should generate tokens with correct payload', async () => {
      await service.verify(mockWallet, mockSignature);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { wallet: mockWallet, playerId: mockPlayer.id },
        expect.objectContaining({ secret: 'access_secret' }),
      );
    });

    it('should verify wallet address case-insensitively', async () => {
      (ethers.verifyMessage as jest.Mock).mockReturnValue(mockWallet.toUpperCase());

      const result = await service.verify(mockWallet.toLowerCase(), mockSignature);

      expect(result.authenticated).toBe(true);
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = 'mock_refresh_token';
    const mockPayload = { wallet: mockWallet, playerId: 'player_123' };

    beforeEach(() => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockCacheService.get.mockResolvedValue(mockRefreshToken);
    });

    it('should refresh tokens successfully', async () => {
      const result = await service.refreshTokens(mockRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when refresh token is missing', async () => {
      await expect(service.refreshTokens(undefined)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens(undefined)).rejects.toThrow('Missing refresh token');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token is revoked', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'Refresh token revoked',
      );
    });

    it('should throw UnauthorizedException when cached token does not match', async () => {
      mockCacheService.get.mockResolvedValue('different_token');

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('parseExpiry', () => {
    it('should parse seconds correctly', () => {
      expect(service.parseExpiry('60s')).toBe(60);
      expect(service.parseExpiry('3600s')).toBe(3600);
    });

    it('should parse minutes correctly', () => {
      expect(service.parseExpiry('5m')).toBe(300);
      expect(service.parseExpiry('60m')).toBe(3600);
    });

    it('should parse hours correctly', () => {
      expect(service.parseExpiry('1h')).toBe(3600);
      expect(service.parseExpiry('24h')).toBe(86400);
    });

    it('should parse days correctly', () => {
      expect(service.parseExpiry('1d')).toBe(86400);
      expect(service.parseExpiry('7d')).toBe(604800);
    });

    it('should return raw number as seconds for unknown suffix', () => {
      expect(service.parseExpiry('3600')).toBe(3600);
    });
  });
});
