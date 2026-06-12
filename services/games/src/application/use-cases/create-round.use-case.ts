import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';

import { ROUND_REPOSITORY, type RoundRepository } from '../ports/round-repository.port';
import { CrashPointCalculator } from '@/domain/provably-fair/crash-point-calculator';
import { EVENT_BUS, type EventBus } from '../ports/event-bus.port';
import { CLOCK, type Clock } from '../ports/clock.port';
import { Round } from '@/domain/round/round.entity';

type CreateRoundInput = {
  bettingWindowMs?: number;
  serverSeed?: string;
  previousServerSeedHash?: string;
  hashChainIndex?: number;
};

type CreateRoundOutput = {
  id: string;
  status: string;
  serverSeedHash: string;
  bettingEndsAt: string;
};

@Injectable()
export class CreateRoundUseCase {
  private readonly calculator = new CrashPointCalculator();

  constructor(
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(input: CreateRoundInput = {}): Promise<CreateRoundOutput> {
    const now = this.clock.now();
    const bettingWindowMs = input.bettingWindowMs ?? 10_000;
    // A seed real fica escondida ate o crash; antes disso publicamos apenas o hash.
    const serverSeed = input.serverSeed ?? randomBytes(32).toString('hex');
    const round = Round.createBetting({
      id: randomUUID(),
      serverSeed,
      serverSeedHash: this.calculator.hashSeed(serverSeed),
      previousServerSeedHash: input.previousServerSeedHash,
      hashChainIndex: input.hashChainIndex,
      bettingStartedAt: now,
      bettingEndsAt: new Date(now.getTime() + bettingWindowMs),
    });

    await this.rounds.save(round);
    // O evento avisa outros adaptadores que uma nova janela de aposta foi aberta.
    await this.eventBus.publish('round.betting.started', {
      roundId: round.id,
      bettingEndsAt: round.bettingEndsAt.toISOString(),
      serverSeedHash: round.serverSeedHash,
    });

    return {
      id: round.id,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      bettingEndsAt: round.bettingEndsAt.toISOString(),
    };
  }
}
