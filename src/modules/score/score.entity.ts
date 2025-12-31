import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('scores')
@Unique(['playerId', 'timestamp'])
@Index('idx_player_score', ['playerId', 'score'])
@Index('idx_score_timestamp', ['score', 'timestamp'])
export class ScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 36,
  })
  playerId: string;

  @Column({
    type: 'int',
    unsigned: true,
  })
  score: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, string | number> | null;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}
