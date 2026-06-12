import { Inject, Injectable } from '@nestjs/common';

import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';
import { EVENT_BUS, type EventBus } from '../ports/event-bus.port';
import { RoundNotFoundError } from './game-use-case.errors';
import { CLOCK, type Clock } from '../ports/clock.port';

type FinishRoundInput = {
  roundId: string;
  serverSeed: string;
};

type FinishRoundOutput = {
  roundId: string;
  status: string;
  crashPoint: number;
  crashedAt: string;
};

@Injectable()
export class FinishRoundUseCase {
  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: FinishRoundInput): Promise<FinishRoundOutput> {
    const round = await this.rounds.findById(input.roundId);

    if (!round) {
      throw new RoundNotFoundError(input.roundId);
    }

    const crashedAt = this.clock.now();

    round.crash({
      serverSeed: input.serverSeed,
      crashedAt,
    });

    await this.rounds.save(round);
    await this.eventBus.publish('round.crashed', {
      roundId: round.id,
      crashPoint: round.crashPoint as number,
      crashedAt: crashedAt.toISOString(),
      serverSeed: input.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed as string,
      nonce: round.nonce as number,
    });

    return {
      roundId: round.id,
      status: round.status,
      crashPoint: round.crashPoint as number,
      crashedAt: crashedAt.toISOString(),
    };
  }
}
