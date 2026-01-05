import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getInfo() {
    return {
      name: 'Real-time Multiplayer Game Leaderboard System',
      version: '1.0.0',
      status: 'running',
      documentation: {
        endpoints: {
          'POST /api/v1/auth/wallet/request': 'Request authentication nonce',
          'POST /api/v1/auth/wallet/verify': 'Verify wallet signature',
          'POST /api/v1/auth/wallet/refresh': 'Refresh access token',
          'POST /api/v1/scores': 'Submit player score',
          'GET /api/v1/leaderboard': 'Get leaderboard rankings',
          'GET /api/v1/leaderboard/player': 'Get player rank',
        },
        authenticationRequired: true,
        testPage: 'http://localhost:3000/test.html - Web3 Wallet Authentication Test',
      },
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

