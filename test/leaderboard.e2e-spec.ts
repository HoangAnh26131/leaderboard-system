import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { Wallet, HDNodeWallet } from 'ethers';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

import { ScoreModule } from '../src/modules/score/score.module';
import { LeaderboardModule } from '../src/modules/leaderboard/leaderboard.module';
import { PlayerModule } from '../src/modules/player/player.module';
import { AuthWalletModule } from '../src/modules/auth-wallet/auth-wallet.module';
import { CacheModule } from '../src/modules/cache/cache.module';
import { PlayerEntity } from '../src/modules/player/player.entity';
import { ScoreEntity } from '../src/modules/score/score.entity';
import { CACHE_CLIENT } from '../src/modules/cache/cache.constant';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import Redis from 'ioredis';

describe('Score Submission Flow (e2e)', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  let wallet: HDNodeWallet;

  let mysqlContainer: StartedMySqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;

  beforeAll(async () => {
    // Start MySQL container
    mysqlContainer = await new MySqlContainer('mysql:8.0')
      .withDatabase('leaderboard_test')
      .withUsername('test_user')
      .withRootPassword('test_password')
      .withUserPassword('test_password')
      .start();

    // Start Redis container
    redisContainer = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();

    // Create Redis client
    redis = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379),
    });

    wallet = Wallet.createRandom();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: mysqlContainer.getHost(),
          port: mysqlContainer.getPort(),
          username: mysqlContainer.getUsername(),
          password: mysqlContainer.getUserPassword(),
          database: mysqlContainer.getDatabase(),
          entities: [PlayerEntity, ScoreEntity],
          synchronize: true,
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
        BullModule.forRoot({
          redis: {
            host: redisContainer.getHost(),
            port: redisContainer.getMappedPort(6379),
          },
        }),
        CacheModule,
        PlayerModule,
        ScoreModule,
        LeaderboardModule,
        AuthWalletModule,
      ],
    })
      .overrideProvider(CACHE_CLIENT)
      .useValue(redis)
      .compile();

    app = moduleRef.createNestApplication();

    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();

    agent = request.agent(app.getHttpServer());
  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (redis && redis.status === 'ready') {
      await redis.quit().catch(() => {});
    }
    if (redisContainer) {
      await redisContainer.stop().catch(() => {});
    }
    if (mysqlContainer) {
      await mysqlContainer.stop().catch(() => {});
    }
  });

  beforeEach(async () => {
    // Clear Redis before each test
    if (redis && redis.status === 'ready') {
      await redis.flushall();
    }
  });

  it('should verify wallet and set cookie', async () => {
    const nonceRes = await agent
      .post('/auth/wallet/request')
      .send({ wallet: wallet.address })
      .expect(201);

    const message = nonceRes.body.data.message;

    const signature = await wallet.signMessage(message);

    const verifyRes = await agent
      .post('/auth/wallet/verify')
      .send({
        wallet: wallet.address,
        signature,
      })
      .expect(201);

    expect(verifyRes.body.data).toBeDefined();
    expect(verifyRes.body.data).not.toHaveProperty('token');
    expect(verifyRes.body.data.authenticated).toBe(true);

    const cookies = Array.isArray(verifyRes.headers['set-cookie'])
      ? verifyRes.headers['set-cookie']
      : [verifyRes.headers['set-cookie']];

    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toContain('access_token=');
    expect(cookies.join(';')).toContain('refresh_token=');
  });

  it('should return leaderboard with scores', async () => {
    const res = await agent.get('/leaderboard?offset=0&limit=10&timeframe=alltime').expect(200);

    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(-1);
    expect(res.body.data.items.length).toBeLessThanOrEqual(10);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('limit', 10);
    expect(res.body.data).toHaveProperty('offset', 0);
  });

  it('should return leaderboard with scores and custom limit', async () => {
    const res = await agent.get('/leaderboard?offset=0&limit=2&timeframe=alltime').expect(200);

    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(-1);
    expect(res.body.data.items.length).toBeLessThanOrEqual(2);
  });

  it('should return player rank', async () => {
    const res = await agent.get('/leaderboard/player?timeframe=alltime').expect(200);

    expect(res.body.data).toHaveProperty('player');
    expect(res.body.data).toHaveProperty('surrounding');
    expect(res.body.data.surrounding).toHaveProperty('above');
    expect(res.body.data.surrounding).toHaveProperty('below');
  });
});
