export const REALTIME_EVENTS = Symbol('REALTIME_EVENTS');

export type RoundBettingStartedPayload = {
  roundId: string;
  bettingEndsAt: string;
  serverSeedHash: string;
};

export type RoundRunningStartedPayload = {
  roundId: string;
  startedAt: string;
};

export type MultiplierTickPayload = {
  roundId: string;
  multiplier: number;
  elapsedMs: number;
};

export type BetAcceptedPayload = {
  roundId: string;
  betId: string;
  playerId: string;
  username: string;
  amountCents: string;
};

export type BetCashedOutPayload = {
  roundId: string;
  betId: string;
  playerId: string;
  username: string;
  multiplier: number;
  payoutCents: string;
};

export type RoundCrashedPayload = {
  roundId: string;
  crashPoint: number;
  crashedAt: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
};

export interface RealtimeEvents {
  emitRoundBettingStarted(payload: RoundBettingStartedPayload): void;
  emitRoundRunningStarted(payload: RoundRunningStartedPayload): void;
  emitMultiplierTick(payload: MultiplierTickPayload): void;
  emitBetAccepted(payload: BetAcceptedPayload): void;
  emitBetCashedOut(payload: BetCashedOutPayload): void;
  emitRoundCrashed(payload: RoundCrashedPayload): void;
}
