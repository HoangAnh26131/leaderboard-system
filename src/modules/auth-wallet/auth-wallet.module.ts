import { Module } from '@nestjs/common';
import { AuthWalletService } from './auth-wallet.service';
import { AuthWalletController } from './auth-wallet.controller';
import { JwtModule } from '@nestjs/jwt';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [JwtModule.register({}), PlayerModule],
  controllers: [AuthWalletController],
  providers: [AuthWalletService],
})
export class AuthWalletModule {}
