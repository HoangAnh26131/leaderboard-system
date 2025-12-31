import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { Wallet } from 'ethers';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Auth Wallet (e2e)', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  let wallet: Wallet;

  const TEST_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

  beforeAll(async () => {
    wallet = new Wallet(TEST_PRIVATE_KEY);

    const moduleRef = await Test.createTestingModule({
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

    // IMPORTANT: keeps cookies between requests
    agent = request.agent(app.getHttpServer());
  });

  it('POST /auth/wallet/request → returns nonce', async () => {
    const res = await agent
      .post('/auth/wallet/request')
      .send({
        wallet: wallet.address,
      })
      .expect(201);

    expect(res.body).toHaveProperty('nonce');
    expect(typeof res.body.nonce).toBe('string');
  });

  it('POST /auth/wallet/verify → verify signature & set cookies', async () => {
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

    const cookies = Array.from(verifyRes.headers['set-cookie']);

    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toContain('access_token=');
    expect(cookies.join(';')).toContain('refresh_token=');
  });

  it('POST /auth/wallet/refresh → refresh tokens using cookie', async () => {
    const res = await agent.post('/auth/wallet/refresh').expect(201);

    expect(res.body).toEqual({ success: true });

    const cookies = Array.from(res.headers['set-cookie']);

    expect(cookies.join(';')).toContain('access_token=');
    expect(cookies.join(';')).toContain('refresh_token=');
  });

  it('POST /auth/wallet/verify → reject invalid signature', async () => {
    await agent
      .post('/auth/wallet/verify')
      .send({
        wallet: wallet.address,
        signature: 'invalid-signature',
      })
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
