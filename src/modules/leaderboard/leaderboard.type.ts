export enum ETimeframe {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALLTIME = 'alltime',
}

export type TLeaderboardRetrievalPayload = {
  timeframe: ETimeframe;
  limit: number;
  offset: number;
  playerId: string;
};

export type TLeaderboardRecords = {
  playerId: string;
  totalScore: string;
  rank: string;
  total: string;
};
