import { Test, TestingModule } from '@nestjs/testing';
import { AuthWalletController } from './auth-wallet.controller';
import { AuthWalletService } from './auth-wallet.service';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response, Request } from 'express';

describe('AuthWalletController', () => {
  let controller: AuthWalletController;
  let mockAuthWalletService: Record<string, jest.Mock>;
  let mockConfigService: Record<string, jest.Mock>;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    mockAuthWalletService = {
      requestNonce: jest.fn().mockResolvedValue({
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        nonce: 'abc123def456',
        duration: 100,
        message: 'Sign this nonce to authenticate: abc123def456',
      }),
      verify: jest.fn().mockResolvedValue({
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        authenticated: true,
        token: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_456',
        },
      }),
      refreshTokens: jest.fn().mockResolvedValue({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      }),
      parseExpiry: jest.fn().mockReturnValue(86400),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'development',
          JWT_ACCESS_EXPIRES_IN: '1d',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key] || defaultValue;
      }),
    };

    mockResponse = {
      cookie: jest.fn(),
    };

    mockRequest = {
      cookies: {
        refresh_token: 'existing_refresh_token',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthWalletController],
      providers: [
        {
          provide: AuthWalletService,
          useValue: mockAuthWalletService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthWalletController>(AuthWalletController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('request', () => {
    it('should return nonce for wallet', async () => {
      const wallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      const result = await controller.request(wallet);

      expect(result.wallet).toBe(wallet);
      expect(result.nonce).toBeDefined();
      expect(result.duration).toBe(100);
    });

    it('should call service with wallet address', async () => {
      const wallet = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      await controller.request(wallet);

      expect(mockAuthWalletService.requestNonce).toHaveBeenCalledWith(wallet);
    });
  });

  describe('verify', () => {
    const verifyDto = {
      wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      signature: '0x1234567890abcdef',
    };

    it('should verify signature and return authenticated response', async () => {
      const result = await controller.verify(verifyDto, mockResponse as Response);

      expect(result.wallet).toBe(verifyDto.wallet);
      expect(result.authenticated).toBe(true);
    });

    it('should set access_token cookie', async () => {
      await controller.verify(verifyDto, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'access_token_123',
        expect.objectContaining({
          httpOnly: true,
        }),
      );
    });

    it('should set refresh_token cookie', async () => {
      await controller.verify(verifyDto, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh_token_456',
        expect.objectContaining({
          httpOnly: true,
        }),
      );
    });

    it('should call service with wallet and signature', async () => {
      await controller.verify(verifyDto, mockResponse as Response);

      expect(mockAuthWalletService.verify).toHaveBeenCalledWith(
        verifyDto.wallet,
        verifyDto.signature,
      );
    });

    it('should not include token in response body', async () => {
      const result = await controller.verify(verifyDto, mockResponse as Response);

      expect(result).not.toHaveProperty('token');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const result = await controller.refresh(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(result.success).toBe(true);
    });

    it('should set new access_token cookie', async () => {
      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'new_access_token',
        expect.any(Object),
      );
    });

    it('should set new refresh_token cookie', async () => {
      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new_refresh_token',
        expect.any(Object),
      );
    });

    it('should extract refresh token from cookies', async () => {
      await controller.refresh(mockRequest as Request, mockResponse as Response);

      expect(mockAuthWalletService.refreshTokens).toHaveBeenCalledWith('existing_refresh_token');
    });
  });
});
