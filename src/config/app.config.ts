import { ConfigModuleOptions } from '@nestjs/config';

export const appConfig: ConfigModuleOptions = {
  isGlobal: true,
  envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
};
