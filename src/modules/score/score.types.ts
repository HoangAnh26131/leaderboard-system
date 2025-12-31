export type TScoreSubmitPayload = {
  playerId: string;
  score: number;
  metadata: { level: number; timespent: number; [x: string]: string | number };
  timestamp: Date;
};

export type TScoreProcessorSaveScorePayload = TScoreSubmitPayload & { totalScore: number };
