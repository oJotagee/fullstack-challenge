import { Inject, Injectable } from '@nestjs/common';

import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';
import { CurrentRoundNotFoundError } from './game-use-case.errors';

type CurrentRoundOutput = {
  id: string;
  status: string;
  serverSeedHash: string;
  bettingEndsAt: string;
  crashPoint?: number;
};

@Injectable()
export class GetCurrentRoundUseCase {
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(): Promise<CurrentRoundOutput> {
    const round = await this.rounds.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    return {
      id: round.id,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      bettingEndsAt: round.bettingEndsAt.toISOString(),
      crashPoint: round.crashPoint,
    };
  }
}
