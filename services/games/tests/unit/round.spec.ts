import { describe, expect, it } from 'bun:test';

import { RoundStatus } from '../../src/domain/round/round-status.enum';
import { Round } from '../../src/domain/round/round.entity';

describe('Round', () => {
  it('creates a betting round with committed server seed hash', () => {
    const bettingStartedAt = new Date('2026-01-01T00:00:00.000Z');
    const bettingEndsAt = new Date('2026-01-01T00:00:10.000Z');

    const round = Round.createBetting({
      id: 'round-1',
      serverSeedHash: 'hash-1',
      bettingStartedAt,
      bettingEndsAt,
    });

    expect(round.status).toBe(RoundStatus.BETTING);
    expect(round.id).toBe('round-1');
    expect(round.serverSeedHash).toBe('hash-1');
    expect(round.serverSeed).toBeUndefined();
    expect(round.bettingStartedAt).toBe(bettingStartedAt);
    expect(round.canAcceptBets(new Date('2026-01-01T00:00:09.000Z'))).toBe(true);
    expect(round.canAcceptBets(bettingEndsAt)).toBe(false);
  });

  it('checks if a fresh betting round can accept bets using the current time', () => {
    const round = Round.createBetting({
      id: 'round-1',
      serverSeedHash: 'hash-1',
      bettingStartedAt: new Date(Date.now() - 1000),
      bettingEndsAt: new Date(Date.now() + 1000),
    });

    expect(round.canAcceptBets()).toBe(true);
  });

  it('runs only through BETTING -> RUNNING -> CRASHED -> SETTLED', () => {
    const round = createRound();
    const startedAt = new Date('2026-01-01T00:00:11.000Z');
    const crashedAt = new Date('2026-01-01T00:00:20.000Z');
    const settledAt = new Date('2026-01-01T00:00:23.000Z');

    round.start({
      clientSeed: 'client-seed-1',
      nonce: 1,
      crashPoint: 2.5,
      startedAt,
    });

    expect(round.status).toBe(RoundStatus.RUNNING);
    expect(round.clientSeed).toBe('client-seed-1');
    expect(round.nonce).toBe(1);
    expect(round.crashPoint).toBe(2.5);
    expect(round.runningStartedAt).toBe(startedAt);

    round.crash({ serverSeed: 'server-seed-1', crashedAt });

    expect(round.status).toBe(RoundStatus.CRASHED);
    expect(round.serverSeed).toBe('server-seed-1');
    expect(round.crashedAt).toBe(crashedAt);

    round.settle({ settledAt });

    expect(round.status).toBe(RoundStatus.SETTLED);
    expect(round.settledAt).toBe(settledAt);
  });

  it('rejects invalid round transitions', () => {
    const round = createRound();

    expect(() => round.crash({ serverSeed: 'server-seed-1' })).toThrow();
    expect(() => round.settle()).toThrow();

    round.start({
      clientSeed: 'client-seed-1',
      nonce: 1,
      crashPoint: 2,
    });

    expect(() =>
      round.start({
        clientSeed: 'client-seed-1',
        nonce: 2,
        crashPoint: 3,
      }),
    ).toThrow();

    round.crash({ serverSeed: 'server-seed-1' });
    round.settle();

    expect(() => round.crash({ serverSeed: 'server-seed-1' })).toThrow();
  });

  it('rejects invalid betting window and crash point', () => {
    expect(() =>
      Round.createBetting({
        id: 'round-1',
        serverSeedHash: 'hash-1',
        bettingStartedAt: new Date('2026-01-01T00:00:10.000Z'),
        bettingEndsAt: new Date('2026-01-01T00:00:10.000Z'),
      }),
    ).toThrow();

    const round = createRound();

    expect(() =>
      round.start({
        clientSeed: 'client-seed-1',
        nonce: 1,
        crashPoint: 0.99,
      }),
    ).toThrow();
  });

  it('restores a persisted round', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:20.000Z');

    const round = Round.restore({
      id: 'round-1',
      status: RoundStatus.CRASHED,
      serverSeedHash: 'hash-1',
      serverSeed: 'server-seed-1',
      clientSeed: 'client-seed-1',
      nonce: 1,
      crashPoint: 2.5,
      bettingStartedAt: createdAt,
      bettingEndsAt: new Date('2026-01-01T00:00:10.000Z'),
      runningStartedAt: new Date('2026-01-01T00:00:11.000Z'),
      crashedAt: updatedAt,
      createdAt,
      updatedAt,
    });

    expect(round.status).toBe(RoundStatus.CRASHED);
    expect(round.crashPoint).toBe(2.5);
    expect(round.createdAt).toBe(createdAt);
    expect(round.updatedAt).toBe(updatedAt);
  });

  it('cancels an unrecoverable active round', () => {
    const round = createRound();

    round.cancel({ cancelledAt: new Date('2026-01-01T00:00:05.000Z') });

    expect(round.status).toBe(RoundStatus.CANCELLED);
    expect(round.updatedAt.toISOString()).toBe('2026-01-01T00:00:05.000Z');
  });
});

function createRound(): Round {
  return Round.createBetting({
    id: 'round-1',
    serverSeedHash: 'hash-1',
    bettingStartedAt: new Date('2026-01-01T00:00:00.000Z'),
    bettingEndsAt: new Date('2026-01-01T00:00:10.000Z'),
  });
}
