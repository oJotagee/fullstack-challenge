import type { Round } from '@/domain/round/round.entity';

export const ROUND_REPOSITORY = Symbol('ROUND_REPOSITORY');

export interface RoundRepository {
  findById(id: string): Promise<Round | null>;
  findCurrent(): Promise<Round | null>;
  findHistory(limit: number): Promise<Round[]>;
  save(round: Round): Promise<void>;
}
