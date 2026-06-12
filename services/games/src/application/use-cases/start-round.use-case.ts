import { Inject, Injectable } from '@nestjs/common';

import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';
import { EVENT_BUS, type EventBus } from '../ports/event-bus.port';
import { RoundNotFoundError } from './game-use-case.errors';
import { CLOCK, type Clock } from '../ports/clock.port';

type StartRoundInput = {
  roundId: string;
  clientSeed: string;
  nonce: number;
  crashPoint: number;
};

type StartRoundOutput = {
  roundId: string;
  status: string;
  crashPoint: number;
  startedAt: string;
};

@Injectable()
export class StartRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: StartRoundInput): Promise<StartRoundOutput> {
    const round = await this.rounds.findById(input.roundId);

    if (!round) {
      throw new RoundNotFoundError(input.roundId);
    }

    const startedAt = this.clock.now();

    round.start({
      clientSeed: input.clientSeed,
      nonce: input.nonce,
      crashPoint: input.crashPoint,
      startedAt,
    });

    await this.rounds.save(round);
    await this.eventBus.publish('round.running.started', {
      roundId: round.id,
      startedAt: startedAt.toISOString(),
    });

    return {
      roundId: round.id,
      status: round.status,
      crashPoint: input.crashPoint,
      startedAt: startedAt.toISOString(),
    };
  }
}
