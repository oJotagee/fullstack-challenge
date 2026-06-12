import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';
import { BET_REPOSITORY, type BetRepository } from '../ports/bet-repository.port';
import { EVENT_BUS, type EventBus } from '../ports/event-bus.port';
import { CLOCK, type Clock } from '../ports/clock.port';
import { Bet } from '@/domain/bet/bet.entity';
import {
  CurrentRoundNotFoundError,
  DuplicatedBetError,
  RoundNotBettingError,
} from './game-use-case.errors';

type PlaceBetInput = {
  playerId: string;
  username: string;
  amountCents: string;
};

type PlaceBetOutput = {
  betId: string;
  roundId: string;
  status: string;
  amountCents: string;
};

@Injectable()
export class PlaceBetUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    @Inject(BET_REPOSITORY) private readonly bets: BetRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const round = await this.rounds.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    // A aposta so pode nascer durante a janela BETTING.
    if (!round.canAcceptBets(this.clock.now())) {
      throw new RoundNotBettingError();
    }

    const existingBet = await this.bets.findByRoundIdAndPlayerId(round.id, input.playerId);

    if (existingBet) {
      throw new DuplicatedBetError(round.id, input.playerId);
    }

    // A bet fica pendente ate o Wallet confirmar o debito via evento.
    const bet = Bet.createPending({
      id: randomUUID(),
      roundId: round.id,
      playerId: input.playerId,
      username: input.username,
      amountCents: input.amountCents,
      createdAt: this.clock.now(),
    });
    const operationId = `bet:${bet.id}:debit`;

    await this.bets.save(bet);
    // Game nao debita saldo diretamente; pede ao Wallet pelo broker.
    await this.eventBus.publish('wallet.debit.requested', {
      operationId,
      playerId: input.playerId,
      roundId: round.id,
      betId: bet.id,
      amountCents: bet.amountCents.toString(),
    });

    return {
      betId: bet.id,
      roundId: round.id,
      status: bet.status,
      amountCents: bet.amountCents.toString(),
    };
  }
}
