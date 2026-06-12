import { Inject, Injectable } from '@nestjs/common';

import { BET_REPOSITORY, type BetRepository } from '../ports/bet-repository.port';
import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';
import { CurrentRoundNotFoundError } from './game-use-case.errors';

type CurrentRoundOutput = {
  id: string;
  status: string;
  serverSeedHash: string;
  bettingEndsAt: string;
  crashPoint?: number;
  bets: Array<{
    id: string;
    playerId: string;
    username: string;
    status: string;
    amountCents: string;
    cashoutMultiplier?: number;
    payoutCents?: string;
  }>;
};

@Injectable()
export class GetCurrentRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    @Inject(BET_REPOSITORY) private readonly bets: BetRepository,
  ) {}

  async execute(): Promise<CurrentRoundOutput> {
    const round = await this.rounds.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    const bets = await this.bets.findByRoundId(round.id);

    return {
      id: round.id,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      bettingEndsAt: round.bettingEndsAt.toISOString(),
      crashPoint: round.crashPoint,
      // O estado atual precisa carregar as apostas para sincronizar a tela inicial.
      bets: bets.map((bet) => ({
        id: bet.id,
        playerId: bet.playerId,
        username: bet.username,
        status: bet.status,
        amountCents: bet.amountCents.toString(),
        cashoutMultiplier: bet.cashoutMultiplier,
        payoutCents: bet.payoutCents?.toString(),
      })),
    };
  }
}
