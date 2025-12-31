import { IsNotEmpty, IsString } from 'class-validator';

export class AuthWalletVerifyDto {
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}
