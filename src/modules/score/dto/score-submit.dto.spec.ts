import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ScoreSubmitDto } from './score-submit.dto';

describe('ScoreSubmitDto', () => {
  const validPayload = {
    playerId: 'player_123',
    score: 15000,
    metadata: { level: 5, timespent: 120 },
    timestamp: '2024-01-15T10:30:00Z',
  };

  describe('playerId validation', () => {
    it('should pass with valid playerId', async () => {
      const dto = plainToInstance(ScoreSubmitDto, validPayload);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail when playerId is empty', async () => {
      const dto = plainToInstance(ScoreSubmitDto, { ...validPayload, playerId: '' });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('playerId');
    });

    it('should fail when playerId is missing', async () => {
      const { playerId, ...payloadWithoutPlayerId } = validPayload;
      const dto = plainToInstance(ScoreSubmitDto, payloadWithoutPlayerId);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'playerId')).toBe(true);
    });

    it('should fail when playerId is not a string', async () => {
      const dto = plainToInstance(ScoreSubmitDto, { ...validPayload, playerId: 12345 });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('playerId');
    });
  });

  describe('score validation', () => {
    it('should pass with valid score', async () => {
      const dto = plainToInstance(ScoreSubmitDto, validPayload);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with zero score', async () => {
      const dto = plainToInstance(ScoreSubmitDto, { ...validPayload, score: 0 });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with max score (1,000,000)', async () => {
      const dto = plainToInstance(ScoreSubmitDto, { ...validPayload, score: 1000000 });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail with negative score', async () => {
      const dto = plainToInstance(ScoreSubmitDto, { ...validPayload, score: -10 });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('score');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should fail when score exceeds max (1,000,000)', async () => {
      const dto = plainToInstance(ScoreSubmitDto, { ...validPayload, score: 1000001 });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('score');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should fail when score is not a number', async () => {
      const dto = plainToInstance(ScoreSubmitDto, { ...validPayload, score: 'invalid' });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('score');
    });
  });

  describe('metadata validation', () => {
    it('should pass with valid metadata object', async () => {
      const dto = plainToInstance(ScoreSubmitDto, validPayload);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with metadata containing strings and numbers', async () => {
      const dto = plainToInstance(ScoreSubmitDto, {
        ...validPayload,
        metadata: { level: 5, character: 'warrior', timespent: 120 },
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail when metadata is not an object', async () => {
      const dto = plainToInstance(ScoreSubmitDto, { ...validPayload, metadata: 'invalid' });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('metadata');
    });

    it('should fail when metadata is missing', async () => {
      const { metadata, ...payloadWithoutMetadata } = validPayload;
      const dto = plainToInstance(ScoreSubmitDto, payloadWithoutMetadata);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'metadata')).toBe(true);
    });
  });

  describe('timestamp validation', () => {
    it('should pass with valid ISO timestamp string', async () => {
      const dto = plainToInstance(ScoreSubmitDto, validPayload);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should pass with Date object', async () => {
      const dto = plainToInstance(ScoreSubmitDto, {
        ...validPayload,
        timestamp: new Date(),
      });
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should transform string timestamp to Date', async () => {
      const dto = plainToInstance(ScoreSubmitDto, validPayload);

      expect(dto.timestamp).toBeInstanceOf(Date);
    });

    it('should fail when timestamp is invalid', async () => {
      const dto = plainToInstance(ScoreSubmitDto, {
        ...validPayload,
        timestamp: 'invalid-date',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('timestamp');
    });
  });

  describe('full payload validation', () => {
    it('should pass with complete valid payload', async () => {
      const dto = plainToInstance(ScoreSubmitDto, validPayload);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should fail with empty payload', async () => {
      const dto = plainToInstance(ScoreSubmitDto, {});
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with all invalid fields', async () => {
      const dto = plainToInstance(ScoreSubmitDto, {
        playerId: '',
        score: -100,
        metadata: 'invalid',
        timestamp: 'invalid',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
