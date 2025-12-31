export type TScoreSubmitPayload = {
  playerId: string;
  score: number;
  metadata: Record<string, string | number>;
  timestamp: Date;
};

export type TScoreProcessorSaveScorePayload = TScoreSubmitPayload & { totalScore: number };
