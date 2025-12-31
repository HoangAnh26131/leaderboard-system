import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('players')
export class PlayerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 42 })
  wallet: string;

  @Column({ type: 'bigint', default: 0 })
  totalScore: number;

  @CreateDateColumn()
  createdAt: Date;
}
