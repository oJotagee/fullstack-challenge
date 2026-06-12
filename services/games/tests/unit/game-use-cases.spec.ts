import { describe, expect, it } from 'bun:test';

import { GetCurrentRoundUseCase } from '../../src/application/use-cases/get-current-round.use-case';
import { GetRoundHistoryUseCase } from '../../src/application/use-cases/get-round-history.use-case';
import { SettleLostBetsUseCase } from '../../src/application/use-cases/settle-lost-bets.use-case';
import { CreateRoundUseCase } from '../../src/application/use-cases/create-round.use-case';
import { VerifyRoundUseCase } from '../../src/application/use-cases/verify-round.use-case';
import { FinishRoundUseCase } from '../../src/application/use-cases/finish-round.use-case';
import type { RoundRepository } from '../../src/application/ports/round-repository.port';
import { StartRoundUseCase } from '../../src/application/use-cases/start-round.use-case';
import { GetMyBetsUseCase } from '../../src/application/use-cases/get-my-bets.use-case';
import type { BetRepository } from '../../src/application/ports/bet-repository.port';
import { PlaceBetUseCase } from '../../src/application/use-cases/place-bet.use-case';
import { CashOutUseCase } from '../../src/application/use-cases/cash-out.use-case';
import type { EventBus } from '../../src/application/ports/event-bus.port';
import { RoundStatus } from '../../src/domain/round/round-status.enum';
import type { Clock } from '../../src/application/ports/clock.port';
import { BetStatus } from '../../src/domain/bet/bet-status.enum';
import { Round } from '../../src/domain/round/round.entity';
import { Bet } from '../../src/domain/bet/bet.entity';
import {
  BetNotFoundError,
  CurrentRoundNotFoundError,
  DuplicatedBetError,
  RoundFairnessNotRevealedError,
  RoundNotBettingError,
  RoundNotFoundError,
  RoundNotRunningError,
} from '../../src/application/use-cases/game-use-case.errors';

type PublishedEvent = {
  type: string;
  payload: unknown;
};

class FakeClock implements Clock {
  constructor(private currentTime: Date) {}

  now(): Date {
    return this.currentTime;
  }

  set(now: Date): void {
    this.currentTime = now;
  }
}

class FakeEventBus implements EventBus {
  readonly events: PublishedEvent[] = [];

  async publish<TPayload>(type: string, payload: TPayload): Promise<void> {
    // Captura eventos publicados sem precisar de RabbitMQ no teste unitario.
    this.events.push({ type, payload });
  }
}

class FakeRoundRepository implements RoundRepository {
  private readonly rounds = new Map<string, Round>();

  async findById(id: string): Promise<Round | null> {
    return this.rounds.get(id) ?? null;
  }

  async findCurrent(): Promise<Round | null> {
    // Simula a busca da rodada ativa que o repository Prisma fara no banco.
    return (
      [...this.rounds.values()].find((round) =>
        [RoundStatus.BETTING, RoundStatus.RUNNING].includes(round.status),
      ) ?? null
    );
  }

  async findLatest(): Promise<Round | null> {
    return (
      [...this.rounds.values()].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )[0] ?? null
    );
  }

  async findHistory(pagination: { limit: number; offset: number }): Promise<Round[]> {
    return [...this.rounds.values()]
      .filter((round) => [RoundStatus.CRASHED, RoundStatus.SETTLED].includes(round.status))
      .slice(pagination.offset, pagination.offset + pagination.limit);
  }

  async countHistory(): Promise<number> {
    return [...this.rounds.values()].filter((round) =>
      [RoundStatus.CRASHED, RoundStatus.SETTLED].includes(round.status),
    ).length;
  }

  async save(round: Round): Promise<void> {
    this.rounds.set(round.id, round);
  }
}

class FakeBetRepository implements BetRepository {
  private readonly bets = new Map<string, Bet>();

  async findById(id: string): Promise<Bet | null> {
    return this.bets.get(id) ?? null;
  }

  async findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<Bet | null> {
    return (
      [...this.bets.values()].find((bet) => bet.roundId === roundId && bet.playerId === playerId) ??
      null
    );
  }

  async findByPlayerId(
    playerId: string,
    pagination: { limit: number; offset: number } = { limit: 20, offset: 0 },
  ): Promise<Bet[]> {
    return [...this.bets.values()]
      .filter((bet) => bet.playerId === playerId)
      .slice(pagination.offset, pagination.offset + pagination.limit);
  }

  async findByRoundId(roundId: string): Promise<Bet[]> {
    return [...this.bets.values()].filter((bet) => bet.roundId === roundId);
  }

  async countByPlayerId(playerId: string): Promise<number> {
    return [...this.bets.values()].filter((bet) => bet.playerId === playerId).length;
  }

  async save(bet: Bet): Promise<void> {
    // Map em memoria permite verificar a mutacao do agregado depois do use case.
    this.bets.set(bet.id, bet);
  }
}

describe('Game use cases', () => {
  it('creates a betting round and publishes round.betting.started', async () => {
    const rounds = new FakeRoundRepository();
    const eventBus = new FakeEventBus();
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    const useCase = new CreateRoundUseCase(rounds, eventBus, clock);

    const output = await useCase.execute({
      bettingWindowMs: 10_000,
      serverSeed: 'server-seed-1',
    });

    expect(output.status).toBe(RoundStatus.BETTING);
    expect(output.bettingEndsAt).toBe('2026-01-01T00:00:10.000Z');
    expect(await rounds.findById(output.id)).not.toBeNull();
    expect(eventBus.events[0]).toEqual({
      type: 'round.betting.started',
      payload: {
        roundId: output.id,
        bettingEndsAt: '2026-01-01T00:00:10.000Z',
        serverSeedHash: output.serverSeedHash,
      },
    });
  });

  it('place bet creates a pending bet and publishes wallet debit request', async () => {
    const { rounds, bets, eventBus, clock } = createUseCaseDependencies();
    const round = createBettingRound(clock.now());
    await rounds.save(round);
    const useCase = new PlaceBetUseCase(rounds, bets, eventBus, clock);

    const output = await useCase.execute({
      playerId: 'player-1',
      username: 'player',
      amountCents: '1000',
    });

    const bet = await bets.findById(output.betId);

    // PlaceBet cria a bet localmente e delega o debito para o Wallet.
    expect(output.status).toBe('PENDING_DEBIT');
    expect(bet?.amountCents).toBe(1000n);
    expect(eventBus.events[0]).toEqual({
      type: 'wallet.debit.requested',
      payload: {
        operationId: `bet:${output.betId}:debit`,
        playerId: 'player-1',
        roundId: round.id,
        betId: output.betId,
        amountCents: '1000',
      },
    });
  });

  it('place bet rejects duplicated bets and closed betting rounds', async () => {
    const { rounds, bets, eventBus, clock } = createUseCaseDependencies();
    const round = createBettingRound(clock.now());
    await rounds.save(round);
    const useCase = new PlaceBetUseCase(rounds, bets, eventBus, clock);
    const input = {
      playerId: 'player-1',
      username: 'player',
      amountCents: '1000',
    };

    await useCase.execute(input);
    await expect(useCase.execute(input)).rejects.toThrow(DuplicatedBetError);

    const closedRound = createBettingRound(new Date('2025-01-01T00:00:00.000Z'));
    const closedRounds = new FakeRoundRepository();
    await closedRounds.save(closedRound);
    const closedUseCase = new PlaceBetUseCase(
      closedRounds,
      new FakeBetRepository(),
      eventBus,
      clock,
    );

    await expect(closedUseCase.execute(input)).rejects.toThrow(RoundNotBettingError);
  });

  it('current round fails when there is no active round', async () => {
    const useCase = new GetCurrentRoundUseCase(new FakeRoundRepository(), new FakeBetRepository());

    await expect(useCase.execute()).rejects.toThrow(CurrentRoundNotFoundError);
  });

  it('current round returns round state with bets', async () => {
    const { rounds, bets, clock } = createUseCaseDependencies();
    const round = createBettingRound(clock.now());
    await rounds.save(round);
    await bets.save(
      Bet.createPending({
        id: 'bet-1',
        roundId: round.id,
        playerId: 'player-1',
        username: 'player',
        amountCents: 1000n,
      }),
    );
    const useCase = new GetCurrentRoundUseCase(rounds, bets);

    const output = await useCase.execute();

    expect(output).toEqual({
      id: round.id,
      status: RoundStatus.BETTING,
      serverSeedHash: 'hash-1',
      bettingEndsAt: '2026-01-01T00:00:10.000Z',
      crashPoint: undefined,
      bets: [
        {
          id: 'bet-1',
          playerId: 'player-1',
          username: 'player',
          status: 'PENDING_DEBIT',
          amountCents: '1000',
          cashoutMultiplier: undefined,
          payoutCents: undefined,
        },
      ],
    });
  });

  it('gets authenticated player bet history', async () => {
    const bets = new FakeBetRepository();
    const bet = Bet.createPending({
      id: 'bet-1',
      roundId: 'round-1',
      playerId: 'player-1',
      username: 'player',
      amountCents: 1000n,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    bet.accept({ debitOperationId: 'bet:bet-1:debit' });
    bet.cashOut({ multiplier: 2, creditOperationId: 'bet:bet-1:credit' });
    await bets.save(bet);
    const useCase = new GetMyBetsUseCase(bets);

    const output = await useCase.execute({ playerId: 'player-1', page: 1, limit: 10 });

    expect(output.bets).toEqual([
      {
        id: 'bet-1',
        roundId: 'round-1',
        status: 'CASHED_OUT',
        amountCents: '1000',
        cashoutMultiplier: 2,
        payoutCents: '2000',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(output.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('place bet fails when there is no current round', async () => {
    const { bets, eventBus, clock } = createUseCaseDependencies();
    const useCase = new PlaceBetUseCase(new FakeRoundRepository(), bets, eventBus, clock);

    await expect(
      useCase.execute({
        playerId: 'player-1',
        username: 'player',
        amountCents: '1000',
      }),
    ).rejects.toThrow(CurrentRoundNotFoundError);
  });

  it('starts a betting round and publishes round.running.started', async () => {
    const { rounds, eventBus, clock } = createUseCaseDependencies();
    const round = createBettingRound(clock.now());
    await rounds.save(round);
    const useCase = new StartRoundUseCase(rounds, eventBus, clock);

    const output = await useCase.execute({
      roundId: round.id,
      clientSeed: 'client-seed-1',
      nonce: 1,
      crashPoint: 2,
    });

    expect(output).toEqual({
      roundId: round.id,
      status: RoundStatus.RUNNING,
      crashPoint: 2,
      startedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(eventBus.events[0]).toEqual({
      type: 'round.running.started',
      payload: {
        roundId: round.id,
        startedAt: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('cash out calculates payout and publishes wallet credit request', async () => {
    const { rounds, bets, eventBus, clock } = createUseCaseDependencies();
    const round = createRunningRound();
    await rounds.save(round);
    const bet = Bet.createPending({
      id: 'bet-1',
      roundId: round.id,
      playerId: 'player-1',
      username: 'player',
      amountCents: 1000n,
    });
    bet.accept({ debitOperationId: 'bet:bet-1:debit' });
    await bets.save(bet);
    clock.set(new Date('2026-01-01T00:00:26.000Z'));
    const useCase = new CashOutUseCase(rounds, bets, eventBus, clock);

    const output = await useCase.execute({
      playerId: 'player-1',
    });

    // CashOut calcula payout no dominio, avisa a UI e publica o pedido de credito.
    expect(output).toEqual({
      betId: 'bet-1',
      roundId: round.id,
      status: 'CASHED_OUT',
      payoutCents: '2500',
      multiplier: 2.5,
    });
    expect(eventBus.events[0]).toEqual({
      type: 'bet.cashed_out',
      payload: {
        roundId: round.id,
        betId: 'bet-1',
        playerId: 'player-1',
        username: 'player',
        multiplier: 2.5,
        payoutCents: '2500',
      },
    });
    expect(eventBus.events[1]).toEqual({
      type: 'wallet.credit.requested',
      payload: {
        operationId: 'bet:bet-1:credit',
        playerId: 'player-1',
        roundId: round.id,
        betId: 'bet-1',
        amountCents: '2500',
      },
    });
  });

  it('cash out rejects missing bet and non-running round', async () => {
    const { rounds, bets, eventBus, clock } = createUseCaseDependencies();
    const bettingRound = createBettingRound(clock.now());
    await rounds.save(bettingRound);
    const useCase = new CashOutUseCase(rounds, bets, eventBus, clock);

    await expect(useCase.execute({ playerId: 'player-1' })).rejects.toThrow(RoundNotRunningError);

    const runningRounds = new FakeRoundRepository();
    await runningRounds.save(createRunningRound());
    const runningUseCase = new CashOutUseCase(runningRounds, bets, eventBus, clock);

    await expect(runningUseCase.execute({ playerId: 'player-1' })).rejects.toThrow(
      BetNotFoundError,
    );

    clock.set(new Date('2026-01-01T00:00:31.000Z'));
    await expect(runningUseCase.execute({ playerId: 'player-1' })).rejects.toThrow(
      RoundNotRunningError,
    );
  });

  it('history returns crashed rounds', async () => {
    const rounds = new FakeRoundRepository();
    const crashedRound = createCrashedRound();
    const bettingRound = Round.createBetting({
      id: 'round-2',
      serverSeedHash: 'hash-2',
      bettingStartedAt: new Date('2026-01-01T00:00:00.000Z'),
      bettingEndsAt: new Date('2026-01-01T00:00:10.000Z'),
    });
    await rounds.save(crashedRound);
    await rounds.save(bettingRound);
    const useCase = new GetRoundHistoryUseCase(rounds);

    const output = await useCase.execute({ page: 1, limit: 20 });

    expect(output.rounds).toEqual([
      {
        id: crashedRound.id,
        crashPoint: 2,
        crashedAt: '2026-01-01T00:00:20.000Z',
        serverSeedHash: 'hash-1',
      },
    ]);
    expect(output.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('verify returns revealed fairness data', async () => {
    const rounds = new FakeRoundRepository();
    const round = createCrashedRound();
    await rounds.save(round);
    const useCase = new VerifyRoundUseCase(rounds);

    const output = await useCase.execute({ roundId: round.id });

    expect(output).toEqual({
      roundId: round.id,
      serverSeed: 'server-seed-1',
      serverSeedHash: 'hash-1',
      clientSeed: 'client-seed-1',
      nonce: 1,
      crashPoint: 2,
    });
  });

  it('finishes a running round and publishes round.crashed', async () => {
    const { rounds, eventBus, clock } = createUseCaseDependencies();
    const round = createRunningRound();
    await rounds.save(round);
    const useCase = new FinishRoundUseCase(rounds, eventBus, clock);

    const output = await useCase.execute({
      roundId: round.id,
      serverSeed: 'server-seed-1',
    });

    expect(output).toEqual({
      roundId: round.id,
      status: RoundStatus.CRASHED,
      crashPoint: 3,
      crashedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(eventBus.events[0]).toEqual({
      type: 'round.crashed',
      payload: {
        roundId: round.id,
        crashPoint: 3,
        crashedAt: '2026-01-01T00:00:00.000Z',
        serverSeed: 'server-seed-1',
        serverSeedHash: 'hash-1',
        clientSeed: 'client-seed-1',
        nonce: 1,
      },
    });
  });

  it('settles accepted bets as lost after crash', async () => {
    const { rounds, bets, eventBus, clock } = createUseCaseDependencies();
    const round = createCrashedRound();
    const acceptedBet = Bet.createPending({
      id: 'bet-1',
      roundId: round.id,
      playerId: 'player-1',
      username: 'player',
      amountCents: 1000n,
    });
    const cashedOutBet = Bet.createPending({
      id: 'bet-2',
      roundId: round.id,
      playerId: 'player-2',
      username: 'player-2',
      amountCents: 1000n,
    });
    acceptedBet.accept({ debitOperationId: 'bet:bet-1:debit' });
    cashedOutBet.accept({ debitOperationId: 'bet:bet-2:debit' });
    cashedOutBet.cashOut({ multiplier: 2, creditOperationId: 'bet:bet-2:credit' });
    await rounds.save(round);
    await bets.save(acceptedBet);
    await bets.save(cashedOutBet);
    const useCase = new SettleLostBetsUseCase(rounds, bets, eventBus, clock);

    const output = await useCase.execute({ roundId: round.id });

    expect(output).toEqual({
      roundId: round.id,
      lostBetsCount: 1,
      settledAt: '2026-01-01T00:00:00.000Z',
    });
    expect(acceptedBet.status).toBe(BetStatus.LOST);
    expect(cashedOutBet.status).toBe(BetStatus.CASHED_OUT);
    expect(eventBus.events[0]).toEqual({
      type: 'round.settled',
      payload: {
        roundId: round.id,
        settledAt: '2026-01-01T00:00:00.000Z',
        lostBetsCount: 1,
      },
    });
  });

  it('verify fails when round does not exist or fairness was not revealed', async () => {
    const rounds = new FakeRoundRepository();
    const useCase = new VerifyRoundUseCase(rounds);

    await expect(useCase.execute({ roundId: 'missing-round' })).rejects.toThrow(RoundNotFoundError);

    const bettingRound = createBettingRound(new Date('2026-01-01T00:00:00.000Z'));
    await rounds.save(bettingRound);

    await expect(useCase.execute({ roundId: bettingRound.id })).rejects.toThrow(
      RoundFairnessNotRevealedError,
    );
  });
});

function createUseCaseDependencies(): {
  rounds: FakeRoundRepository;
  bets: FakeBetRepository;
  eventBus: FakeEventBus;
  clock: FakeClock;
} {
  return {
    rounds: new FakeRoundRepository(),
    bets: new FakeBetRepository(),
    eventBus: new FakeEventBus(),
    clock: new FakeClock(new Date('2026-01-01T00:00:00.000Z')),
  };
}

function createBettingRound(now: Date): Round {
  return Round.createBetting({
    id: 'round-1',
    serverSeedHash: 'hash-1',
    bettingStartedAt: now,
    bettingEndsAt: new Date(now.getTime() + 10_000),
  });
}

function createRunningRound(): Round {
  const round = createBettingRound(new Date('2026-01-01T00:00:00.000Z'));

  round.start({
    clientSeed: 'client-seed-1',
    nonce: 1,
    crashPoint: 3,
    startedAt: new Date('2026-01-01T00:00:11.000Z'),
  });

  return round;
}

function createCrashedRound(): Round {
  const round = createBettingRound(new Date('2026-01-01T00:00:00.000Z'));

  round.start({
    clientSeed: 'client-seed-1',
    nonce: 1,
    crashPoint: 2,
    startedAt: new Date('2026-01-01T00:00:11.000Z'),
  });
  round.crash({
    serverSeed: 'server-seed-1',
    crashedAt: new Date('2026-01-01T00:00:20.000Z'),
  });

  return round;
}
