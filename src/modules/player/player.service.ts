import { Injectable, NotFoundException } from '@nestjs/common';
import { MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerEntity } from './player.entity';
import { CacheService } from '../cache/cache.service';
import {
  PLAYER_BY_ID_KEY,
  PLAYER_BY_ID_TTL,
  PLAYER_BY_WALLET_KEY,
  PLAYER_BY_WALLET_TTL,
} from './player.constant';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(PlayerEntity)
    private readonly repo: Repository<PlayerEntity>,
    private readonly cacheService: CacheService,
  ) {}

  async getOrCreateByWallet(wallet: string): Promise<PlayerEntity> {
    const key = `${PLAYER_BY_WALLET_KEY}${wallet}`;

    let player = await this.cacheService.get<PlayerEntity>(key);
    if (player) return player;

    player = await this.repo.findOne({
      where: { wallet: wallet.toLowerCase().trim() },
    });

    if (player) return player;

    const playerInstance = this.repo.create({
      wallet: wallet.toLowerCase(),
      totalScore: 0,
    });

    player = await this.repo.save(playerInstance);

    this.cacheService.set(key, player, { ttl: PLAYER_BY_WALLET_TTL });

    return player;
  }

  async updateTotalScore(playerId: string, totalScore: number): Promise<number> {
    const player = await this.getById(playerId);
    if (!player) throw new NotFoundException(`Player with id ${playerId} not found`);

    player.totalScore = totalScore;

    await this.repo.update(player.id, player);

    this.cacheService.set(`${PLAYER_BY_WALLET_KEY}${player.wallet}`, player, {
      ttl: PLAYER_BY_WALLET_TTL,
    });
    this.cacheService.set(`${PLAYER_BY_ID_KEY}${playerId}`, player, { ttl: PLAYER_BY_ID_TTL });

    return player.totalScore;
  }

  async getById(playerId: string): Promise<PlayerEntity | null> {
    const key = `${PLAYER_BY_ID_KEY}${playerId}`;

    const cache = await this.cacheService.get<PlayerEntity>(key);
    if (cache) return cache;

    const player = await this.repo.findOne({ where: { id: playerId } });
    if (player) this.cacheService.set(key, player, { ttl: PLAYER_BY_ID_TTL });

    return player;
  }
}
