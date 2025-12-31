import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';

export interface TestContainers {
  mysqlContainer: StartedMySqlContainer;
  redisContainer: StartedTestContainer;
  redis: Redis;
}

export async function setupTestContainers(): Promise<TestContainers> {
  // Start MySQL container
  const mysqlContainer = await new MySqlContainer('mysql:8.0')
    .withDatabase('leaderboard_test')
    .withUsername('test_user')
    .withRootPassword('test_password')
    .withUserPassword('test_password')
    .start();

  // Start Redis container
  const redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  // Create Redis client
  const redis = new Redis({
    host: redisContainer.getHost(),
    port: redisContainer.getMappedPort(6379),
  });

  return {
    mysqlContainer,
    redisContainer,
    redis,
  };
}

export async function teardownTestContainers(containers: TestContainers): Promise<void> {
  await containers.redis.quit();
  await containers.redisContainer.stop();
  await containers.mysqlContainer.stop();
}

export function getTestDatabaseConfig(mysqlContainer: StartedMySqlContainer) {
  return {
    type: 'mysql' as const,
    host: mysqlContainer.getHost(),
    port: mysqlContainer.getPort(),
    username: mysqlContainer.getUsername(),
    password: mysqlContainer.getUserPassword(),
    database: mysqlContainer.getDatabase(),
    synchronize: true,
    autoLoadEntities: true,
  };
}

export function getTestRedisConfig(redisContainer: StartedTestContainer) {
  return {
    host: redisContainer.getHost(),
    port: redisContainer.getMappedPort(6379),
  };
}
