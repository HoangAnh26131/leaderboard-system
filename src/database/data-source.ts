import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { PlayerEntity } from '../modules/player/player.entity';
import { ScoreEntity } from '..//modules/score/score.entity';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [PlayerEntity, ScoreEntity],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
