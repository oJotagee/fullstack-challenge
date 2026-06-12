import type { Bet } from '@/domain/bet/bet.entity';

export const BET_REPOSITORY = Symbol('BET_REPOSITORY');

export interface BetRepository {
  findById(id: string): Promise<Bet | null>;
  findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<Bet | null>;
  findByPlayerId(playerId: string): Promise<Bet[]>;
  save(bet: Bet): Promise<void>;
}
