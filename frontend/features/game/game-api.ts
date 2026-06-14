import { api } from '@/lib/http-client';

export type RoundPhase = 'BETTING' | 'RUNNING' | 'CRASHED' | 'SETTLED';
export type BetStatus = 'PENDING_DEBIT' | 'ACCEPTED' | 'CASHED_OUT' | 'LOST' | 'REJECTED';

export interface Bet {
  id: string;
  roundId: string;
  playerId: string;
  username: string;
  amountCents: string;
  status: BetStatus;
  cashoutMultiplier?: string;
  payoutCents?: string;
  createdAt: string;
  cashedOutAt?: string;
}

export interface Round {
  id: string;
  status: RoundPhase;
  serverSeedHash: string;
  serverSeed?: string;
  bettingEndsAt?: string;
  startedAt?: string;
  crashedAt?: string;
  crashPoint?: string;
  bets: Bet[];
}

export interface RoundSummary {
  id: string;
  crashPoint: string | number;
  crashedAt: string;
}

export interface RoundHistory {
  rounds: RoundSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VerifyRoundResponse {
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashPoint: string;
}

export interface PlaceBetRequest {
  amount: string;
}

export interface PlaceBetResponse {
  betId: string;
  status: BetStatus;
}

export interface CashOutResponse {
  betId: string;
  payoutCents: string;
  multiplier: number;
}

export function getCurrentRound(): Promise<Round> {
  return api<Round>('/games/rounds/current');
}

export function getRoundHistory(page = 1, limit = 20): Promise<RoundHistory> {
  return api<RoundHistory>(`/games/rounds/history?page=${page}&limit=${limit}`);
}

export function verifyRound(roundId: string): Promise<VerifyRoundResponse> {
  return api<VerifyRoundResponse>(`/games/rounds/${roundId}/verify`);
}

export function getMyBets(page = 1, limit = 20): Promise<{ bets: Bet[]; total: number }> {
  return api<{ bets: Bet[]; total: number }>(`/games/bets/me?page=${page}&limit=${limit}`);
}

export function placeBet(body: PlaceBetRequest): Promise<PlaceBetResponse> {
  return api<PlaceBetResponse>('/games/bet', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function cashOut(): Promise<CashOutResponse> {
  return api<CashOutResponse>('/games/bet/cashout', { method: 'POST' });
}
