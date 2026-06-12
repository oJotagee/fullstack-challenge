import { Inject, Injectable } from '@nestjs/common';

import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';

type RoundHistoryOutput = {
  rounds: Array<{
    id: string;
    crashPoint: number;
    crashedAt: string;
    serverSeedHash: string;
  }>;
};

export type { RoundHistoryOutput };

@Injectable()
export class GetRoundHistoryUseCase {
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(input: { limit?: number } = {}): Promise<RoundHistoryOutput> {
    const rounds = await this.rounds.findHistory(input.limit ?? 20);

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
    };
  }
}
