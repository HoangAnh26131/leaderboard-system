import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SCORE_PROCESSOR_SAVE_SCORE, SCORE_QUEUE } from './score.constant';
import { ScoreEntity } from './score.entity';
import { Job } from 'bull';
import { TScoreProcessorSaveScorePayload } from './score.types';
import { PlayerService } from '../player/player.service';

@Processor(SCORE_QUEUE)
@Injectable()
export class ScoreProcessor {
  constructor(
    @InjectRepository(ScoreEntity)
    private readonly scoreRepository: Repository<ScoreEntity>,
    private readonly playerService: PlayerService,
  ) {}

  @Process(SCORE_PROCESSOR_SAVE_SCORE)
  async handleSaveScore(job: Job<TScoreProcessorSaveScorePayload>) {
    try {
      await this.scoreRepository.save(job.data);
      await this.playerService.updateTotalScore(job.data.playerId, job.data.totalScore);
    } catch (err) {
      console.error('Failed to save score to DB:', err);
      throw err;
    }
  }
}
