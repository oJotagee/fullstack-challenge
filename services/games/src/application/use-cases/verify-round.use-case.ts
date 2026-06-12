import { Inject, Injectable } from '@nestjs/common';

import { RoundFairnessNotRevealedError, RoundNotFoundError } from './game-use-case.errors';
import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';

type VerifyRoundOutput = {
  roundId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashPoint: number;
};

@Injectable()
export class VerifyRoundUseCase {
  constructor(@Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository) {}

  async execute(input: { roundId: string }): Promise<VerifyRoundOutput> {
    const round = await this.rounds.findById(input.roundId);

    if (!round) {
      throw new RoundNotFoundError(input.roundId);
    }

    // A verificacao so fica disponivel depois que a seed foi revelada no crash.
    if (
      !round.serverSeed ||
      !round.clientSeed ||
      round.nonce === undefined ||
      round.crashPoint === undefined
    ) {
      throw new RoundFairnessNotRevealedError(input.roundId);
    }

    return {
      roundId: round.id,
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      crashPoint: round.crashPoint,
    };
  }
}
