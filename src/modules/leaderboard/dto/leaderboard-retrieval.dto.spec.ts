import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LeaderboardRetrievalDto } from './leaderboard-retrieval.dto';
import { ETimeframe } from '../leaderboard.type';

describe('LeaderboardRetrievalDto', () => {
  describe('timeframe validation', () => {
    it('should pass with valid timeframe ALLTIME', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with valid timeframe DAILY', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.DAILY,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with valid timeframe WEEKLY', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.WEEKLY,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with valid timeframe MONTHLY', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.MONTHLY,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail with invalid timeframe', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: 'invalid',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('timeframe');
    });
  });

  describe('limit validation', () => {
    it('should use default limit when not provided', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
      });

      expect(dto.limit).toBe(100);
    });

    it('should pass with valid limit', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
        limit: 50,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with max limit (1000)', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
        limit: 1000,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail with limit exceeding max (1000)', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
        limit: 1001,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
    });

    it('should fail with zero limit', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
        limit: 0,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
    });

    it('should fail with negative limit', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
        limit: -10,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('offset validation', () => {
    it('should use default offset (0) when not provided', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
      });

      expect(dto.offset).toBe(0);
    });

    it('should pass with valid offset', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
        offset: 100,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail with negative offset', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
        offset: -1,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('offset');
    });
  });

  describe('playerId validation', () => {
    it('should use empty string as default playerId', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
      });

      expect(dto.playerId).toBe('');
    });

    it('should pass with valid playerId', async () => {
      const dto = plainToInstance(LeaderboardRetrievalDto, {
        timeframe: ETimeframe.ALLTIME,
        playerId: 'player_123',
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });
  });
});
