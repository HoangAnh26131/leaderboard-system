import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AUTH_WALLET_NONCE_TTL } from './auth-wallet.constant';
import { ConfigService } from '@nestjs/config';
import { TAuthWalletTokenPayload } from './auth-wallet.type';
import { PlayerService } from '../player/player.service';

@Injectable()
export class AuthWalletService {
  constructor(
    private readonly cache: CacheService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly playerService: PlayerService,
  ) {}

  async requestNonce(wallet: string) {
    const nonce = crypto.randomBytes(16).toString('hex');
    await this.cache.set(this.walletCacheKey(wallet), nonce, { ttl: AUTH_WALLET_NONCE_TTL });

    return { wallet, nonce, duration: AUTH_WALLET_NONCE_TTL, message: this.nonceMessage(nonce) };
  }

  async verify(wallet: string, signature: string) {
    const key = this.walletCacheKey(wallet);
    const nonce = await this.cache.get<string>(key);

    if (!nonce) {
      throw new UnauthorizedException('Nonce expired');
    }

    let recovered: string;
    try {
      recovered = ethers.verifyMessage(this.nonceMessage(nonce), signature);
    } catch {
      throw new UnauthorizedException('Invalid signature format');
    }

    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      throw new UnauthorizedException('Invalid signature');
    }

    await this.cache.del(key);

    const player = await this.playerService.getOrCreateByWallet(wallet);
    const token = await this.generateTokens({ wallet, playerId: player.id });

    return { wallet, authenticated: true, token, playerId: player.id };
  }

  private async generateTokens(payload: TAuthWalletTokenPayload) {
    const cleanPayload: TAuthWalletTokenPayload = {
      playerId: payload.playerId,
      wallet: payload.wallet,
    };

    const accessToken = this.jwtService.sign(cleanPayload, {
      secret: this.config.get<string>('JWT_AUTH_WALLET_ACCESS_SECRET', 'access_secret'),
      expiresIn: this.config.get('JWT_AUTH_WALLET_ACCESS_EXPIRES_IN', '1d'),
    });

    const refreshToken = this.jwtService.sign(cleanPayload, {
      secret: this.config.get<string>('JWT_AUTH_WALLET_REFRESH_SECRET', 'refresh_secret'),
      expiresIn: this.config.get('JWT_AUTH_WALLET_REFRESH_EXPIRES_IN', '7d'),
    });

    // Save refresh token in cache for rotation, TTL in seconds
    await this.cache.set(`refresh_token:${payload.wallet}`, refreshToken, {
      ttl: this.parseExpiry(this.config.get<string>('JWT_AUTH_WALLET_REFRESH_EXPIRES_IN', '7d')),
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken?: string) {
    let payload: TAuthWalletTokenPayload;
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_AUTH_WALLET_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const cachedToken = await this.cache.get<string>(`refresh_token:${payload.wallet}`);
    if (!cachedToken || cachedToken !== refreshToken)
      throw new UnauthorizedException('Refresh token revoked');

    const tokens = await this.generateTokens(payload);

    return tokens;
  }

  private walletCacheKey(wallet: string) {
    return `wallet:nonce:${wallet.toLowerCase()}`;
  }

  private nonceMessage(nonce: string) {
    return `Sign this nonce to authenticate: ${nonce}`;
  }

  public parseExpiry(expiry: string): number {
    const num = parseInt(expiry, 10);
    if (expiry.endsWith('s')) return num;
    if (expiry.endsWith('m')) return num * 60;
    if (expiry.endsWith('h')) return num * 3600;
    if (expiry.endsWith('d')) return num * 3600 * 24;

    return num; // fallback: seconds
  }
}
