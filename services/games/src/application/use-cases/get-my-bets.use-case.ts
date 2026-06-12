import { Inject, Injectable } from '@nestjs/common';

import { BET_REPOSITORY, type BetRepository } from '../ports/bet-repository.port';

type GetMyBetsOutput = {
  bets: Array<{
    id: string;
    roundId: string;
    status: string;
    amountCents: string;
    cashoutMultiplier?: number;
    payoutCents?: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class GetMyBetsUseCase {
  constructor(@Inject(BET_REPOSITORY) private readonly bets: BetRepository) {}

  async execute(input: {
    playerId: string;
    page?: number;
    limit?: number;
  }): Promise<GetMyBetsOutput> {
    const page = normalizePage(input.page);
    const limit = normalizeLimit(input.limit);
    const offset = (page - 1) * limit;
    const [bets, total] = await Promise.all([
      this.bets.findByPlayerId(input.playerId, { limit, offset }),
      this.bets.countByPlayerId(input.playerId),
    ]);

    return {
      bets: bets.map((bet) => ({
        id: bet.id,
        roundId: bet.roundId,
        status: bet.status,
        amountCents: bet.amountCents.toString(),
        cashoutMultiplier: bet.cashoutMultiplier,
        payoutCents: bet.payoutCents?.toString(),
        createdAt: bet.createdAt.toISOString(),
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
