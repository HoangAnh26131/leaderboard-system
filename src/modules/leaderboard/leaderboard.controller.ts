import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardRetrievalDto } from './dto/leaderboard-retrieval.dto';
import { TAuthRequest } from '../../common/types/request';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { LeaderboardPlayerRankDto } from './dto/leaderboard-player-rank.dto';

@Controller('leaderboard')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Query() query: LeaderboardRetrievalDto) {
    return this.leaderboardService.getLeaderboard(query);
  }

  @Get('player')
  async getPlayerRank(@Query() query: LeaderboardPlayerRankDto, @Req() request: TAuthRequest) {
    return this.leaderboardService.getPlayerRankAndSurround(request.user.playerId, query.timeframe);
  }
}
