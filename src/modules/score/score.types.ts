export type TScoreSubmitPayload = {
  playerId: string;
  score: number;
  metadata: { level?: number; timespent?: number; [x: string]: string | number | undefined };
  timestamp: Date;
};

export type TScoreProcessorSaveScorePayload = TScoreSubmitPayload & { totalScore: number };
