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
};

@Injectable()
export class GetMyBetsUseCase {
  constructor(@Inject(BET_REPOSITORY) private readonly bets: BetRepository) {}

  async execute(input: { playerId: string }): Promise<GetMyBetsOutput> {
    const bets = await this.bets.findByPlayerId(input.playerId);

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
    };
  }
}
