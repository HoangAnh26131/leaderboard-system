import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CACHE_CLIENT } from './cache.constant';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn(),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(60),
      quit: jest.fn().mockResolvedValue('OK'),
      pipeline: jest.fn().mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('nonexistent_key');

      expect(result).toBeNull();
    });

    it('should parse and return JSON value', async () => {
      const data = { name: 'test', value: 123 };
      mockRedis.get.mockResolvedValue(JSON.stringify(data));

      const result = await service.get('json_key');

      expect(result).toEqual(data);
    });

    it('should return string value when not JSON', async () => {
      mockRedis.get.mockResolvedValue('plain_string');

      const result = await service.get<string>('string_key');

      expect(result).toBe('plain_string');
    });

    it('should handle complex objects', async () => {
      const complexData = {
        user: { id: 1, name: 'test' },
        scores: [100, 200, 300],
        nested: { deep: { value: true } },
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(complexData));

      const result = await service.get('complex_key');

      expect(result).toEqual(complexData);
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      await service.set('key', 'value');

      expect(mockRedis.set).toHaveBeenCalledWith('key', 'value', 'EX', 60);
    });

    it('should set value with custom TTL', async () => {
      await service.set('key', 'value', { ttl: 300 });

      expect(mockRedis.set).toHaveBeenCalledWith('key', 'value', 'EX', 300);
    });

    it('should serialize object values to JSON', async () => {
      const data = { name: 'test', value: 123 };

      await service.set('key', data);

      expect(mockRedis.set).toHaveBeenCalledWith('key', JSON.stringify(data), 'EX', 60);
    });

    it('should not serialize string values', async () => {
      await service.set('key', 'plain_string');

      expect(mockRedis.set).toHaveBeenCalledWith('key', 'plain_string', 'EX', 60);
    });
  });

  describe('del', () => {
    it('should delete key from cache', async () => {
      await service.del('key_to_delete');

      expect(mockRedis.del).toHaveBeenCalledWith('key_to_delete');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.exists('existing_key');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.exists('nonexistent_key');

      expect(result).toBe(false);
    });
  });

  describe('incr', () => {
    it('should increment value and return new value', async () => {
      const result = await service.incr('counter_key');

      expect(result).toBe(1);
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should set TTL when provided', async () => {
      const mockPipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 5]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await service.incr('counter_key', 300);

      expect(mockPipeline.expire).toHaveBeenCalledWith('counter_key', 300);
    });

    it('should not set TTL when not provided', async () => {
      const mockPipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await service.incr('counter_key');

      expect(mockPipeline.expire).not.toHaveBeenCalled();
    });

    it('should throw error when increment fails', async () => {
      const mockPipeline = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, null]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await expect(service.incr('counter_key')).rejects.toThrow('Failed to increment key');
    });
  });

  describe('expire', () => {
    it('should set expiration on key', async () => {
      const result = await service.expire('key', 300);

      expect(mockRedis.expire).toHaveBeenCalledWith('key', 300);
      expect(result).toBe(1);
    });
  });

  describe('ttl', () => {
    it('should return TTL of key', async () => {
      mockRedis.ttl.mockResolvedValue(120);

      const result = await service.ttl('key');

      expect(result).toBe(120);
      expect(mockRedis.ttl).toHaveBeenCalledWith('key');
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection', async () => {
      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
