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
  let playerId: string;

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
    expect(verifyRes.body).toHaveProperty('playerId');
    expect(verifyRes.body.authenticated).toBe(true);
    playerId = verifyRes.body.playerId;

    const cookies = Array.from(verifyRes.headers['set-cookie']);

    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toContain('access_token=');
    expect(cookies.join(';')).toContain('refresh_token=');
  });

  it('should submit a valid score and return rank', async () => {
    const res = await agent
      .post('/scores')
      .send({
        playerId,
        score: 15000,
        metadata: {},
        timestamp: new Date().toISOString(),
      })
      .expect(201);

    expect(res.body.rank).toBeDefined();
    expect(typeof res.body.rank).toBe('number');
  });

  it('should reject negative score', async () => {
    await agent
      .post('/scores')
      .send({
        playerId,
        score: -10,
        metadata: {},
        timestamp: new Date().toISOString(),
      })
      .expect(400);
  });

  it('should reject score above max limit', async () => {
    await agent
      .post('/scores')
      .send({
        playerId,
        score: 2_000_000,
        metadata: {},
        timestamp: new Date().toISOString(),
      })
      .expect(400);
  });

  it('should reject score missing data', async () => {
    await agent
      .post('/scores')
      .send({
        playerId,
        score: 1,
      })
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
