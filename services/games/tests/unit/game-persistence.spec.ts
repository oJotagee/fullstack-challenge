import { describe, expect, it, mock } from 'bun:test';

import { PrismaBetRepository } from '../../src/infrastructure/persistence/prisma-bet.repository';
import { PrismaRoundRepository } from '../../src/infrastructure/persistence/prisma-round.repository';
import { RoundMapper } from '../../src/infrastructure/persistence/round.mapper';
import { BetMapper } from '../../src/infrastructure/persistence/bet.mapper';
import { RoundStatus } from '../../src/domain/round/round-status.enum';
import { BetStatus } from '../../src/domain/bet/bet-status.enum';
import { Round } from '../../src/domain/round/round.entity';
import { Bet } from '../../src/domain/bet/bet.entity';

describe('Game persistence', () => {
  it('maps rounds between Prisma and domain', () => {
    const prismaRound = createPrismaRound();

    // Mapper isola o dominio dos tipos gerados pelo Prisma.
    const domainRound = RoundMapper.toDomain(prismaRound);
    const persistence = RoundMapper.toPersistence(domainRound);

    expect(domainRound.status).toBe(RoundStatus.CRASHED);
    expect(domainRound.crashPoint).toBe(2.5);
    expect(persistence).toMatchObject({
      id: 'round-1',
      status: RoundStatus.CRASHED,
      serverSeedHash: 'hash-1',
      serverSeed: 'server-seed-1',
      clientSeed: 'client-seed-1',
      nonce: 1,
      crashPoint: 2.5,
    });
  });

  it('maps bets between Prisma and domain', () => {
    const prismaBet = createPrismaBet();

    const domainBet = BetMapper.toDomain(prismaBet);
    const persistence = BetMapper.toPersistence(domainBet);

    expect(domainBet.status).toBe(BetStatus.CASHED_OUT);
    expect(domainBet.payoutCents).toBe(2500n);
    expect(persistence).toMatchObject({
      id: 'bet-1',
      roundId: 'round-1',
      playerId: 'player-1',
      amountCents: 1000n,
      status: BetStatus.CASHED_OUT,
      cashoutMultiplier: 2.5,
      payoutCents: 2500n,
    });
  });

  it('PrismaRoundRepository saves and reads rounds', async () => {
    // Mocka apenas a API usada do Prisma para testar o adapter sem banco real.
    const prisma = {
      round: {
        upsert: mock(async () => undefined),
        findUnique: mock(async () => createPrismaRound()),
        findFirst: mock(async () => createPrismaRound()),
        findMany: mock(async () => [createPrismaRound()]),
      },
    };
    const repository = new PrismaRoundRepository(prisma as never);
    const round = RoundMapper.toDomain(createPrismaRound());

    await repository.save(round);
    await expect(repository.findById('round-1')).resolves.toBeInstanceOf(Round);
    await expect(repository.findCurrent()).resolves.toBeInstanceOf(Round);
    await expect(repository.findHistory(20)).resolves.toHaveLength(1);

    expect(prisma.round.upsert).toHaveBeenCalledWith({
      where: { id: 'round-1' },
      create: expect.objectContaining({ id: 'round-1', status: RoundStatus.CRASHED }),
      update: expect.objectContaining({ status: RoundStatus.CRASHED, crashPoint: 2.5 }),
    });
    expect(prisma.round.findUnique).toHaveBeenCalledWith({ where: { id: 'round-1' } });
  });

  it('PrismaBetRepository saves and reads bets', async () => {
    // O repository usa a chave unica roundId/playerId para impedir aposta duplicada.
    const prisma = {
      bet: {
        upsert: mock(async () => undefined),
        findUnique: mock(async () => createPrismaBet()),
        findMany: mock(async () => [createPrismaBet()]),
      },
    };
    const repository = new PrismaBetRepository(prisma as never);
    const bet = BetMapper.toDomain(createPrismaBet());

    await repository.save(bet);
    await expect(repository.findById('bet-1')).resolves.toBeInstanceOf(Bet);
    await expect(repository.findByRoundIdAndPlayerId('round-1', 'player-1')).resolves.toBeInstanceOf(
      Bet,
    );
    await expect(repository.findByPlayerId('player-1')).resolves.toHaveLength(1);

    expect(prisma.bet.upsert).toHaveBeenCalledWith({
      where: { id: 'bet-1' },
      create: expect.objectContaining({ id: 'bet-1', status: BetStatus.CASHED_OUT }),
      update: expect.objectContaining({ status: BetStatus.CASHED_OUT, payoutCents: 2500n }),
    });
    expect(prisma.bet.findUnique).toHaveBeenCalledWith({
      where: {
        roundId_playerId: {
          roundId: 'round-1',
          playerId: 'player-1',
        },
      },
    });
  });
});

function createPrismaRound(): any {
  return {
    id: 'round-1',
    status: 'CRASHED',
    serverSeedHash: 'hash-1',
    serverSeed: 'server-seed-1',
    clientSeed: 'client-seed-1',
    nonce: 1,
    crashPoint: 2.5,
    bettingStartedAt: new Date('2026-01-01T00:00:00.000Z'),
    bettingEndsAt: new Date('2026-01-01T00:00:10.000Z'),
    runningStartedAt: new Date('2026-01-01T00:00:11.000Z'),
    crashedAt: new Date('2026-01-01T00:00:20.000Z'),
    settledAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:20.000Z'),
  };
}

function createPrismaBet(): any {
  return {
    id: 'bet-1',
    roundId: 'round-1',
    playerId: 'player-1',
    username: 'player',
    amountCents: 1000n,
    status: 'CASHED_OUT',
    rejectedReason: null,
    cashoutMultiplier: 2.5,
    payoutCents: 2500n,
    debitOperationId: 'bet:bet-1:debit',
    creditOperationId: 'bet:bet-1:credit',
    acceptedAt: new Date('2026-01-01T00:00:01.000Z'),
    rejectedAt: null,
    cashedOutAt: new Date('2026-01-01T00:00:05.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:05.000Z'),
  };
}
