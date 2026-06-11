import type { EventEnvelope } from './event-envelope';

export type RoundBettingStarted = EventEnvelope<
  'round.betting.started',
  {
    roundId: string;
    bettingEndsAt: string;
    serverSeedHash: string;
  }
>;

export type RoundRunningStarted = EventEnvelope<
  'round.running.started',
  {
    roundId: string;
    startedAt: string;
  }
>;

export type RoundMultiplierTick = EventEnvelope<
  'round.multiplier.tick',
  {
    roundId: string;
    multiplier: number;
    elapsedMs: number;
  }
>;

export type BetPlaced = EventEnvelope<
  'bet.placed',
  {
    roundId: string;
    betId: string;
    playerId: string;
    username: string;
    amountCents: string;
    status: 'PENDING_DEBIT';
  }
>;

export type BetAccepted = EventEnvelope<
  'bet.accepted',
  {
    roundId: string;
    betId: string;
    playerId: string;
    username: string;
    amountCents: string;
  }
>;

export type BetRejected = EventEnvelope<
  'bet.rejected',
  {
    roundId: string;
    betId: string;
    playerId: string;
    username: string;
    amountCents: string;
    reason: 'INSUFFICIENT_FUNDS' | 'DUPLICATED_BET' | 'ROUND_NOT_BETTING' | 'UNKNOWN';
  }
>;

export type BetCashedOut = EventEnvelope<
  'bet.cashed_out',
  {
    roundId: string;
    betId: string;
    playerId: string;
    username: string;
    multiplier: number;
    payoutCents: string;
  }
>;

export type RoundCrashed = EventEnvelope<
  'round.crashed',
  {
    roundId: string;
    crashPoint: number;
    crashedAt: string;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  }
>;

export type RoundSettled = EventEnvelope<
  'round.settled',
  {
    roundId: string;
    settledAt: string;
    lostBetsCount: number;
  }
>;

export type GameEvent =
  | RoundBettingStarted
  | RoundRunningStarted
  | RoundMultiplierTick
  | BetPlaced
  | BetAccepted
  | BetRejected
  | BetCashedOut
  | RoundCrashed
  | RoundSettled;
