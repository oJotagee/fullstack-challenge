import { Inject, Injectable } from '@nestjs/common';

import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';

type RoundHistoryOutput = {
  rounds: Array<{
    id: string;
    crashPoint: number;
    crashedAt: string;
    serverSeedHash: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type { RoundHistoryOutput };

@Injectable()
export class GetRoundHistoryUseCase {
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(input: { page?: number; limit?: number } = {}): Promise<RoundHistoryOutput> {
    const page = normalizePage(input.page);
    const limit = normalizeLimit(input.limit);
    const offset = (page - 1) * limit;
    const [rounds, total] = await Promise.all([
      this.rounds.findHistory({ limit, offset }),
      this.rounds.countHistory(),
    ]);

    return {
      rounds: rounds
        // Historico publico mostra apenas rodadas que ja possuem resultado revelavel.
        .filter((round) => round.crashPoint !== undefined && round.crashedAt !== undefined)
        .map((round) => ({
          id: round.id,
          crashPoint: round.crashPoint as number,
          crashedAt: (round.crashedAt as Date).toISOString(),
          serverSeedHash: round.serverSeedHash,
        })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

function normalizePage(page?: number): number {
  return Math.max(1, Math.trunc(page ?? 1));
}

function normalizeLimit(limit?: number): number {
  return Math.min(100, Math.max(1, Math.trunc(limit ?? 20)));
}
