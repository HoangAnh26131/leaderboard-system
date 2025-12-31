import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockJwtService: Record<string, jest.Mock>;
  let mockConfigService: Record<string, jest.Mock>;

  const mockPayload = {
    wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    playerId: 'player_123',
  };

  const createMockExecutionContext = (cookies: Record<string, string> = {}): ExecutionContext => {
    const mockRequest = {
      cookies,
      user: null,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    mockJwtService = {
      verify: jest.fn().mockReturnValue(mockPayload),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('access_secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when token is valid', () => {
      const context = createMockExecutionContext({
        access_token: 'valid_token',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should attach user payload to request', () => {
      const context = createMockExecutionContext({
        access_token: 'valid_token',
      });

      guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException when token is missing', () => {
      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Access token missing');
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const context = createMockExecutionContext({
        access_token: 'invalid_token',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Access token invalid or expired');
    });

    it('should throw UnauthorizedException when token is expired', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const context = createMockExecutionContext({
        access_token: 'expired_token',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should verify token with correct secret', () => {
      const context = createMockExecutionContext({
        access_token: 'valid_token',
      });

      guard.canActivate(context);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid_token', {
        secret: 'access_secret',
      });
    });

    it('should use correct config key for secret', () => {
      const context = createMockExecutionContext({
        access_token: 'valid_token',
      });

      guard.canActivate(context);

      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_AUTH_WALLET_ACCESS_SECRET');
    });
  });
});
