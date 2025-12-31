import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import Redis from 'ioredis';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { PlayerService } from '../src/modules/player/player.service';
import { AppModule } from '../src/app.module';

describe('Score API E2E', () => {
  let app: INestApplication;
  let redis: Redis;
  let redisContainer: StartedTestContainer;
  let playerService: PlayerService;

  beforeAll(async () => {
    // Start Redis container
    redisContainer = await new GenericContainer('redis').withExposedPorts(6379).start();

    redis = new Redis({
      host: redisContainer.getHost(),
      port: redisContainer.getMappedPort(6379),
    });

    // Create testing module and override Redis provider
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Redis)
      .useValue(redis)
      .compile();

    app = moduleFixture.createNestApplication();
    // replicate main.ts ValidationPipe & interceptors
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();

    playerService = moduleFixture.get<PlayerService>(PlayerService);

    // Create test players
    await playerService.create('player_123');
    await playerService.create('player_456');
  });

  afterAll(async () => {
    await app.close();
    await redis.quit();
    await redisContainer.stop();
  });

  beforeEach(async () => {
    await redis.flushall(); // clear leaderboard & rate limits
  });

  it('submit score with metadata and timestamp', async () => {
    const payload = {
      playerId: 'player_123',
      score: 15000,
      metadata: { level: 5, timeSpent: 120 },
      timestamp: '2024-01-15T10:30:00Z',
    };

    const res = await request(app.getHttpServer()).post('/scores').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.playerId).toBe(payload.playerId);
    expect(res.body.score).toBe(payload.score);
    expect(res.body.rank).toBeGreaterThan(0);

    const stored = await redis.hgetall(`leaderboard:player:${payload.playerId}`);
    expect(stored.level).toBe(payload.metadata.level.toString());
    expect(stored.timeSpent).toBe(payload.metadata.timeSpent.toString());
    expect(stored.timestamp).toBe(payload.timestamp);
  });

  it('reject negative score', async () => {
    const res = await request(app.getHttpServer())
      .post('/scores')
      .send({ playerId: 'player_123', score: -10 });

    expect(res.status).toBe(400);
  });

  it('reject score exceeding max', async () => {
    const res = await request(app.getHttpServer())
      .post('/scores')
      .send({ playerId: 'player_123', score: 10_000_000 });

    expect(res.status).toBe(400);
  });

  it('rate limit per player', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/scores')
        .send({ playerId: 'player_123', score: i * 100 });
    }

    const res = await request(app.getHttpServer())
      .post('/scores')
      .send({ playerId: 'player_123', score: 999 });

    expect(res.status).toBe(429);
    expect(res.body.message).toContain('Rate limit exceeded');
  });

  it('concurrent submissions from multiple players', async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      const player = i % 2 === 0 ? 'player_123' : 'player_456';
      promises.push(
        request(app.getHttpServer())
          .post('/scores')
          .send({ playerId: player, score: i * 1000 }),
      );
    }

    const results = await Promise.all(promises);
    results.forEach(res => expect(res.status).toBe(201));

    const rank1 = await redis.zrevrank('leaderboard:global:alltime', 'player_123');
    const rank2 = await redis.zrevrank('leaderboard:global:alltime', 'player_456');

    expect(rank1).not.toBeNull();
    expect(rank2).not.toBeNull();
  });
});
