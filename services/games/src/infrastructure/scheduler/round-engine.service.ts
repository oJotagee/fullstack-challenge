import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { ROUND_REPOSITORY, type RoundRepository } from '@/application/ports/round-repository.port';
import { SettleLostBetsUseCase } from '@/application/use-cases/settle-lost-bets.use-case';
import { CrashPointCalculator } from '@/domain/provably-fair/crash-point-calculator';
import { CreateRoundUseCase } from '@/application/use-cases/create-round.use-case';
import { FinishRoundUseCase } from '@/application/use-cases/finish-round.use-case';
import { StartRoundUseCase } from '@/application/use-cases/start-round.use-case';
import { EVENT_BUS, type EventBus } from '@/application/ports/event-bus.port';
import { RoundStatus } from '@/domain/round/round-status.enum';
import { Round } from '@/domain/round/round.entity';

type EngineRoundContext = {
  roundId: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  crashPoint: number;
};

@Injectable()
export class RoundEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoundEngineService.name);
  private readonly calculator = new CrashPointCalculator();
  private readonly bettingWindowMs = numberFromEnv('ROUND_BETTING_WINDOW_MS', 10_000);
  private readonly tickIntervalMs = numberFromEnv('ROUND_TICK_INTERVAL_MS', 100);
  private readonly settlementDelayMs = numberFromEnv('ROUND_SETTLEMENT_DELAY_MS', 3_000);
  private readonly clientSeed = process.env.ROUND_CLIENT_SEED ?? 'crash-game';
  private readonly hashChainLength = numberFromEnv('ROUND_HASH_CHAIN_LENGTH', 10_000);
  private readonly hashChainSeed =
    process.env.ROUND_HASH_CHAIN_SEED ?? randomBytes(32).toString('hex');
  private readonly hashChain = this.calculator.createHashChain(
    this.hashChainSeed,
    this.hashChainLength,
  );
  private readonly enabled = process.env.ROUND_ENGINE_ENABLED !== 'false';
  private nextTimeout?: ReturnType<typeof setTimeout>;
  private tickInterval?: ReturnType<typeof setInterval>;
  private nonce = 0;

  constructor(
    private readonly createRound: CreateRoundUseCase,
    private readonly startRound: StartRoundUseCase,
    private readonly finishRound: FinishRoundUseCase,
    private readonly settleLostBets: SettleLostBetsUseCase,
    @Inject(ROUND_REPOSITORY) private readonly rounds: RoundRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Round engine disabled.');
      return;
    }

    await this.resumeOrScheduleRound();
  }

  onModuleDestroy(): void {
    this.clearTimers();
  }

  async runCycle(): Promise<void> {
    const context = await this.createBettingRound();

    this.nextTimeout = setTimeout(() => {
      void this.startRunningRound(context);
    }, this.bettingWindowMs);
  }

  private async createBettingRound(): Promise<EngineRoundContext> {
    const latestRound = await this.rounds.findLatest();
    const hashChainIndex = (latestRound?.hashChainIndex ?? -1) + 1;
    // Usa uma hash chain reversa: a seed revelada nao permite calcular a seed futura.
    const serverSeed = this.serverSeedForIndex(hashChainIndex);
    const nonce = hashChainIndex;
    const crashPoint = this.calculator.calculate(serverSeed, this.clientSeed, nonce);
    const round = await this.createRound.execute({
      bettingWindowMs: this.bettingWindowMs,
      serverSeed,
      previousServerSeedHash: latestRound?.serverSeedHash,
      hashChainIndex,
    });

    this.nonce = nonce + 1;

    return {
      roundId: round.id,
      serverSeed,
      clientSeed: this.clientSeed,
      nonce,
      crashPoint,
    };
  }

  private serverSeedForIndex(hashChainIndex: number): string {
    const chainNumber = Math.floor(hashChainIndex / this.hashChainLength);
    const seedIndex = hashChainIndex % this.hashChainLength;

    if (chainNumber === 0) {
      return this.hashChain.seeds[seedIndex];
    }

    const rolloverSeed = this.calculator.hashSeed(`${this.hashChainSeed}:${chainNumber}`);

    return this.calculator.createHashChain(rolloverSeed, this.hashChainLength).seeds[seedIndex];
  }

  private async startRunningRound(context: EngineRoundContext): Promise<void> {
    const started = await this.startRound.execute({
      roundId: context.roundId,
      clientSeed: context.clientSeed,
      nonce: context.nonce,
      crashPoint: context.crashPoint,
    });

    const startedAt = Date.parse(started.startedAt);

    this.tickInterval = setInterval(() => {
      void this.emitTickOrCrash(context, startedAt);
    }, this.tickIntervalMs);
  }

  private async emitTickOrCrash(context: EngineRoundContext, startedAt: number): Promise<void> {
    const elapsedMs = Date.now() - startedAt;
    const multiplier = calculateMultiplier(elapsedMs);

    if (multiplier >= context.crashPoint) {
      await this.crashAndSettle(context);
      return;
    }

    await this.eventBus.publish('round.multiplier.tick', {
      roundId: context.roundId,
      multiplier,
      elapsedMs,
    });
  }

  private async crashAndSettle(context: EngineRoundContext): Promise<void> {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }

    await this.finishRound.execute({
      roundId: context.roundId,
      serverSeed: context.serverSeed,
    });

    await this.settleLostBets.execute({ roundId: context.roundId });
    this.scheduleNextRound(this.settlementDelayMs);
  }

  private async resumeOrScheduleRound(): Promise<void> {
    const currentRound = await this.rounds.findCurrent();

    if (!currentRound) {
      this.scheduleNextRound(0);
      return;
    }

    if (currentRound.status === RoundStatus.BETTING) {
      if (!currentRound.serverSeed) {
        this.logger.warn(`Cancelling betting round ${currentRound.id} without server seed.`);
        currentRound.cancel();
        await this.rounds.save(currentRound);
        this.scheduleNextRound(0);
        return;
      }

      const context = this.contextFromBettingRound(currentRound);
      const remainingMs = Math.max(0, currentRound.bettingEndsAt.getTime() - Date.now());

      this.logger.log(`Resuming betting round ${currentRound.id}.`);
      this.nextTimeout = setTimeout(() => {
        void this.startRunningRound(context);
      }, remainingMs);
      return;
    }

    if (currentRound.status === RoundStatus.RUNNING) {
      if (
        !currentRound.serverSeed ||
        !currentRound.clientSeed ||
        currentRound.nonce === undefined ||
        currentRound.crashPoint === undefined
      ) {
        this.logger.warn(`Cancelling running round ${currentRound.id} without fairness data.`);
        currentRound.cancel();
        await this.rounds.save(currentRound);
        this.scheduleNextRound(0);
        return;
      }

      const context = this.contextFromRunningRound(currentRound);
      const startedAt = currentRound.runningStartedAt?.getTime();

      if (!startedAt) {
        this.scheduleNextRound(0);
        return;
      }

      this.logger.log(`Resuming running round ${currentRound.id}.`);
      this.tickInterval = setInterval(() => {
        void this.emitTickOrCrash(context, startedAt);
      }, this.tickIntervalMs);
      return;
    }

    this.scheduleNextRound(this.settlementDelayMs);
  }

  private contextFromBettingRound(round: Round): EngineRoundContext {
    if (!round.serverSeed) {
      throw new Error(`Betting round ${round.id} cannot resume without server seed.`);
    }

    const nonce = round.hashChainIndex ?? this.nonce;
    const clientSeed = round.clientSeed ?? this.clientSeed;

    return {
      roundId: round.id,
      serverSeed: round.serverSeed,
      clientSeed,
      nonce,
      crashPoint:
        round.crashPoint ?? this.calculator.calculate(round.serverSeed, clientSeed, nonce),
    };
  }

  private contextFromRunningRound(round: Round): EngineRoundContext {
    if (
      !round.serverSeed ||
      !round.clientSeed ||
      round.nonce === undefined ||
      round.crashPoint === undefined
    ) {
      throw new Error(`Running round ${round.id} cannot resume without fairness data.`);
    }

    return {
      roundId: round.id,
      serverSeed: round.serverSeed,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      crashPoint: round.crashPoint,
    };
  }

  private scheduleNextRound(delayMs: number): void {
    this.nextTimeout = setTimeout(() => {
      void this.runCycle().catch((error) => {
        this.logger.error('Round engine cycle failed.', error);
        this.scheduleNextRound(this.settlementDelayMs);
      });
    }, delayMs);
  }

  private clearTimers(): void {
    if (this.nextTimeout) {
      clearTimeout(this.nextTimeout);
      this.nextTimeout = undefined;
    }

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }
  }
}

function calculateMultiplier(elapsedMs: number): number {
  const raw = 1 + elapsedMs / 10_000;

  return Math.max(1, Math.floor(raw * 100) / 100);
}

function numberFromEnv(key: string, fallback: number): number {
  const value = Number(process.env[key]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}
