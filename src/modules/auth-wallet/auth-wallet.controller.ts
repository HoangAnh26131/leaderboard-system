import { Controller, Post, Body, Res, Req, UseGuards } from '@nestjs/common';
import { AuthWalletService } from './auth-wallet.service';
import { AuthWalletVerifyDto } from './dto/auth-wallet-verify.dto';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth/wallet')
@UseGuards(ThrottlerGuard)
export class AuthWalletController {
  constructor(
    private readonly service: AuthWalletService,
    private readonly configService: ConfigService,
  ) {}

  @Post('request')
  request(@Body('wallet') wallet: string) {
    return this.service.requestNonce(wallet);
  }

  @Post('verify')
  async verify(@Body() body: AuthWalletVerifyDto, @Res({ passthrough: true }) res: Response) {
    const verify = await this.service.verify(body.wallet, body.signature);

    const { token, ...verifiedData } = verify;

    const cookieBaseOptions: Partial<CookieOptions> = {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
    };

    res.cookie('access_token', token.accessToken, {
      ...cookieBaseOptions,
      maxAge:
        this.service.parseExpiry(
          this.configService.get<string>('JWT_AUTH_WALLET_ACCESS_EXPIRES_IN', '1d'),
        ) * 1000,
    });

    res.cookie('refresh_token', token.refreshToken, {
      ...cookieBaseOptions,
      maxAge:
        this.service.parseExpiry(
          this.configService.get<string>('JWT_AUTH_WALLET_REFRESH_EXPIRES_IN', '7d'),
        ) * 1000,
    });

    return verifiedData;
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    const tokens = await this.service.refreshTokens(refreshToken);

    const cookieBaseOptions: Partial<CookieOptions> = {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
    };

    res.cookie('access_token', tokens.accessToken, {
      ...cookieBaseOptions,
      maxAge:
        this.service.parseExpiry(
          this.configService.get<string>('JWT_AUTH_WALLET_ACCESS_EXPIRES_IN', '1d'),
        ) * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieBaseOptions,
      maxAge:
        this.service.parseExpiry(
          this.configService.get<string>('JWT_AUTH_WALLET_REFRESH_EXPIRES_IN', '7d'),
        ) * 1000,
    });

    return { success: true };
  }
}
