import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Wallet, HDNodeWallet } from 'ethers';
import * as cookieParser from 'cookie-parser';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import Redis from 'ioredis';
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

import { AuthWalletModule } from '../src/modules/auth-wallet/auth-wallet.module';
import { CacheModule } from '../src/modules/cache/cache.module';
import { PlayerModule } from '../src/modules/player/player.module';
import { PlayerEntity } from '../src/modules/player/player.entity';
import { ScoreEntity } from '../src/modules/score/score.entity';
import { CACHE_CLIENT } from '../src/modules/cache/cache.constant';
import { ThrottlerModule } from '@nestjs/throttler';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth Wallet (e2e)', () => {
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
        CacheModule,
        PlayerModule,
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

    // IMPORTANT: keeps cookies between requests
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

  it('POST /auth/wallet/request → returns nonce', async () => {
    const res = await agent
      .post('/auth/wallet/request')
      .send({
        wallet: wallet.address,
      })
      .expect(201);

    expect(res.body.data).toHaveProperty('nonce');
    expect(typeof res.body.data.nonce).toBe('string');
  });

  it('POST /auth/wallet/verify → verify signature & set cookies', async () => {
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

    const cookies = Array.isArray(verifyRes.headers['set-cookie'])
      ? verifyRes.headers['set-cookie']
      : [verifyRes.headers['set-cookie']];

    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toContain('access_token=');
    expect(cookies.join(';')).toContain('refresh_token=');
  });

  it('POST /auth/wallet/refresh → refresh tokens using cookie', async () => {
    // First authenticate to get cookies
    const nonceRes = await agent
      .post('/auth/wallet/request')
      .send({ wallet: wallet.address })
      .expect(201);

    const message = nonceRes.body.data.message;
    const signature = await wallet.signMessage(message);

    await agent.post('/auth/wallet/verify').send({ wallet: wallet.address, signature }).expect(201);

    // Now refresh
    const res = await agent.post('/auth/wallet/refresh').expect(201);

    expect(res.body.data).toEqual({ success: true });

    const cookies = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie']
      : [res.headers['set-cookie']];

    expect(cookies.join(';')).toContain('access_token=');
    expect(cookies.join(';')).toContain('refresh_token=');
  });

  it('POST /auth/wallet/verify → reject invalid signature', async () => {
    // First request nonce
    await agent.post('/auth/wallet/request').send({ wallet: wallet.address }).expect(201);

    // Then try with invalid signature
    await agent
      .post('/auth/wallet/verify')
      .send({
        wallet: wallet.address,
        signature: 'invalid-signature',
      })
      .expect(401);
  });
});
