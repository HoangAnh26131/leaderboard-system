import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { Wallet } from 'ethers';
import { AppModule } from '../src/app.module';

describe('Score Submission Flow (e2e)', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  let wallet: Wallet;

  const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

  beforeAll(async () => {
    wallet = new Wallet(TEST_PRIVATE_KEY);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    await app.init();

    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('should verify wallet and set cookie', async () => {
    const nonceRes = await agent
      .post('/auth/wallet/request')
      .send({ wallet: wallet.address })
      .expect(201);

    const message = nonceRes.body.message;

    const signature = await wallet.signMessage(message);

    const verifyRes = await agent
      .post('/auth/wallet/verify')
      .send({
        wallet: wallet.address,
        signature,
      })
      .expect(201);

    expect(verifyRes.body).toBeDefined();
    expect(verifyRes.body).not.toHaveProperty('token');
    expect(verifyRes.body.authenticated).toBe(true);

    const cookies = Array.from(verifyRes.headers['set-cookie']);

    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toContain('access_token=');
    expect(cookies.join(';')).toContain('refresh_token=');
  });

  it('should return leaderboard with scores', async () => {
    const res = await agent.get('/leaderboard?offset=0&limit=10&timeframe=alltime').expect(200);

    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(-1);
    expect(res.body.items.length).toBeLessThanOrEqual(10);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('limit', 10);
    expect(res.body).toHaveProperty('offset', 0);
  });

  it('should return leaderboard with scores and custom limit', async () => {
    const res = await agent.get('/leaderboard?offset=0&limit=2&timeframe=alltime').expect(200);

    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(-1);
    expect(res.body.items.length).toBeLessThanOrEqual(2);
  });

  it('should return player rank', async () => {
    const res = await agent.get('/leaderboard/player?timeframe=alltime').expect(200);

    expect(res.body).toHaveProperty('player');
    expect(res.body).toHaveProperty('surrounding');
    expect(res.body.surrounding).toHaveProperty('above');
    expect(res.body.surrounding).toHaveProperty('below');
  });
});
