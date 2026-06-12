import { Inject, Injectable } from '@nestjs/common';

import {
  BetNotFoundError,
  CurrentRoundNotFoundError,
  RoundNotRunningError,
} from './game-use-case.errors';
import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';
import { BET_REPOSITORY, type BetRepository } from '../ports/bet-repository.port';
import { EVENT_BUS, type EventBus } from '../ports/event-bus.port';
import { RoundStatus } from '@/domain/round/round-status.enum';
import { BetStatus } from '@/domain/bet/bet-status.enum';
import { CLOCK, type Clock } from '../ports/clock.port';

type CashOutInput = {
  playerId: string;
};

type CashOutOutput = {
  betId: string;
  roundId: string;
  status: string;
  payoutCents: string;
  multiplier: number;
};

@Injectable()
export class CashOutUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    @Inject(BET_REPOSITORY) private readonly bets: BetRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: CashOutInput): Promise<CashOutOutput> {
    const round = await this.rounds.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    if (round.status !== RoundStatus.RUNNING) {
      throw new RoundNotRunningError();
    }

    const multiplier = calculateCurrentMultiplier({
      now: this.clock.now(),
      runningStartedAt: round.runningStartedAt,
    });

    // Cash out no ou depois do crash nao pode gerar pagamento.
    if (round.crashPoint !== undefined && multiplier >= round.crashPoint) {
      throw new RoundNotRunningError();
    }

    const bet = await this.bets.findByRoundIdAndPlayerId(round.id, input.playerId);

    if (!bet || bet.status !== BetStatus.ACCEPTED) {
      throw new BetNotFoundError(input.playerId);
    }

    // O dominio calcula o payout em centavos e trava a bet contra novo cash out.
    const operationId = `bet:${bet.id}:credit`;
    const payoutCents = bet.cashOut({
      multiplier,
      creditOperationId: operationId,
      cashedOutAt: this.clock.now(),
    });

    await this.bets.save(bet);
    await this.eventBus.publish('bet.cashed_out', {
      roundId: round.id,
      betId: bet.id,
      playerId: bet.playerId,
      username: bet.username,
      multiplier,
      payoutCents: payoutCents.toString(),
    });
    // Credito tambem e responsabilidade do Wallet, nao do Game.
    await this.eventBus.publish('wallet.credit.requested', {
      operationId,
      playerId: bet.playerId,
      roundId: round.id,
      betId: bet.id,
      amountCents: payoutCents.toString(),
    });

    return {
      betId: bet.id,
      roundId: round.id,
      status: bet.status,
      payoutCents: payoutCents.toString(),
      multiplier,
    };
  }
}

function calculateCurrentMultiplier(input: { now: Date; runningStartedAt?: Date }): number {
  if (!input.runningStartedAt) {
    throw new RoundNotRunningError();
  }

  const elapsedMs = Math.max(0, input.now.getTime() - input.runningStartedAt.getTime());
  const raw = 1 + elapsedMs / 10_000;

  return Math.max(1, Math.floor(raw * 100) / 100);
}
