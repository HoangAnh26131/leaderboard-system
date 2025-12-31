import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ScoreService } from './score.service';
import { ScoreSubmitDto } from './dto/score-submit.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { TAuthRequest } from '../../common/types/request';

@Controller('scores')
@UseGuards(JwtAuthGuard)
export class ScoreController {
  constructor(private readonly service: ScoreService) {}

  @Post()
  submit(@Body() body: ScoreSubmitDto, @Req() request: TAuthRequest) {
    return this.service.submit(request.user.playerId, body);
  }
}
