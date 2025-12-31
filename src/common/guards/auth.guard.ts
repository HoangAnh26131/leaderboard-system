import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const token: string = request.cookies?.access_token;

    if (!token) throw new UnauthorizedException('Access token missing');

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_AUTH_WALLET_ACCESS_SECRET'),
      });

      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Access token invalid or expired');
    }
  }
}
