import { Inject, Injectable } from '@nestjs/common';

import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';
import { BET_REPOSITORY, type BetRepository } from '../ports/bet-repository.port';
import { EVENT_BUS, type EventBus } from '../ports/event-bus.port';
import { RoundNotFoundError } from './game-use-case.errors';
import { BetStatus } from '@/domain/bet/bet-status.enum';
import { CLOCK, type Clock } from '../ports/clock.port';

type SettleLostBetsInput = {
  roundId: string;
};

type SettleLostBetsOutput = {
  roundId: string;
  lostBetsCount: number;
  settledAt: string;
};

@Injectable()
export class SettleLostBetsUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    @Inject(BET_REPOSITORY) private readonly bets: BetRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: SettleLostBetsInput): Promise<SettleLostBetsOutput> {
    const round = await this.rounds.findById(input.roundId);

    if (!round) {
      throw new RoundNotFoundError(input.roundId);
    }

    const settledAt = this.clock.now();
    const bets = await this.bets.findByRoundId(round.id);
    let lostBetsCount = 0;

    for (const bet of bets) {
      if (bet.status !== BetStatus.ACCEPTED) {
        continue;
      }

      bet.lose({ lostAt: settledAt });
      await this.bets.save(bet);
      lostBetsCount += 1;
    }

    round.settle({ settledAt });
    await this.rounds.save(round);
    await this.eventBus.publish('round.settled', {
      roundId: round.id,
      settledAt: settledAt.toISOString(),
      lostBetsCount,
    });

    return {
      roundId: round.id,
      lostBetsCount,
      settledAt: settledAt.toISOString(),
    };
  }
}
