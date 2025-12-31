import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LeaderboardPlayerRankDto } from './leaderboard-player-rank.dto';
import { ETimeframe } from '../leaderboard.type';

describe('LeaderboardPlayerRankDto', () => {
  describe('timeframe validation', () => {
    it('should pass with valid timeframe ALLTIME', async () => {
      const dto = plainToInstance(LeaderboardPlayerRankDto, {
        timeframe: ETimeframe.ALLTIME,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with valid timeframe DAILY', async () => {
      const dto = plainToInstance(LeaderboardPlayerRankDto, {
        timeframe: ETimeframe.DAILY,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with valid timeframe WEEKLY', async () => {
      const dto = plainToInstance(LeaderboardPlayerRankDto, {
        timeframe: ETimeframe.WEEKLY,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with valid timeframe MONTHLY', async () => {
      const dto = plainToInstance(LeaderboardPlayerRankDto, {
        timeframe: ETimeframe.MONTHLY,
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail with invalid timeframe value', async () => {
      const dto = plainToInstance(LeaderboardPlayerRankDto, {
        timeframe: 'invalid_timeframe',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('timeframe');
    });

    it('should fail with empty timeframe', async () => {
      const dto = plainToInstance(LeaderboardPlayerRankDto, {
        timeframe: '',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('timeframe');
    });

    it('should fail when timeframe is missing', async () => {
      const dto = plainToInstance(LeaderboardPlayerRankDto, {});
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'timeframe')).toBe(true);
    });

    it('should fail with numeric timeframe', async () => {
      const dto = plainToInstance(LeaderboardPlayerRankDto, {
        timeframe: 123,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
