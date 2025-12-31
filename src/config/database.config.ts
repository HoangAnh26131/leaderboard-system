import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { PlayerEntity } from '../modules/player/player.entity';
import { ScoreEntity } from '../modules/score/score.entity';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'mysql',
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_DATABASE'),

    entities: [PlayerEntity, ScoreEntity],

    synchronize: config.get('NODE_ENV') === 'development',
    logging: config.get('NODE_ENV') === 'development',

    poolSize: 20,
    extra: {
      connectionLimit: 20,
    },
  }),
};
