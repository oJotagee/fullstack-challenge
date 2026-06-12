import type { Round } from '@/domain/round/round.entity';

export const ROUND_REPOSITORY = Symbol('ROUND_REPOSITORY');

export interface RoundRepository {
  findById(id: string): Promise<Round | null>;
  findCurrent(): Promise<Round | null>;
  findLatest(): Promise<Round | null>;
  findHistory(pagination: { limit: number; offset: number }): Promise<Round[]>;
  countHistory(): Promise<number>;
  save(round: Round): Promise<void>;
}
