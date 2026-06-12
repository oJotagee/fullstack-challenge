import { describe, expect, it } from 'bun:test';

import { BetRejectedReason, BetStatus } from '../../src/domain/bet/bet-status.enum';
import { Bet } from '../../src/domain/bet/bet.entity';

describe('Bet', () => {
  it('creates a pending bet with money stored in cents', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const bet = Bet.createPending({
      id: 'bet-1',
      roundId: 'round-1',
      playerId: 'player-1',
      username: 'player',
      amountCents: '1050',
      createdAt,
    });

    expect(bet.status).toBe(BetStatus.PENDING_DEBIT);
    expect(bet.id).toBe('bet-1');
    expect(bet.roundId).toBe('round-1');
    expect(bet.playerId).toBe('player-1');
    expect(bet.username).toBe('player');
    expect(bet.amountCents).toBe(1050n);
    expect(bet.createdAt).toBe(createdAt);
  });

  it('accepts a pending bet after wallet debit succeeds', () => {
    const bet = createBet();
    const acceptedAt = new Date('2026-01-01T00:00:01.000Z');

    bet.accept({ debitOperationId: 'bet:bet-1:debit', acceptedAt });

    expect(bet.status).toBe(BetStatus.ACCEPTED);
    expect(bet.debitOperationId).toBe('bet:bet-1:debit');
    expect(bet.acceptedAt).toBe(acceptedAt);
  });

  it('rejects a pending bet when wallet debit fails', () => {
    const bet = createBet();
    const rejectedAt = new Date('2026-01-01T00:00:01.000Z');

    bet.reject({
      reason: BetRejectedReason.INSUFFICIENT_FUNDS,
      rejectedAt,
    });

    expect(bet.status).toBe(BetStatus.REJECTED);
    expect(bet.rejectedReason).toBe(BetRejectedReason.INSUFFICIENT_FUNDS);
    expect(bet.rejectedAt).toBe(rejectedAt);
  });

  it('cashes out only accepted bets and calculates payout in cents', () => {
    const bet = createBet();
    const cashedOutAt = new Date('2026-01-01T00:00:05.000Z');

    bet.accept({ debitOperationId: 'bet:bet-1:debit' });

    const payout = bet.cashOut({
      multiplier: 2.5,
      creditOperationId: 'bet:bet-1:credit',
      cashedOutAt,
    });

    expect(payout).toBe(2500n);
    expect(bet.status).toBe(BetStatus.CASHED_OUT);
    expect(bet.cashoutMultiplier).toBe(2.5);
    expect(bet.payoutCents).toBe(2500n);
    expect(bet.creditOperationId).toBe('bet:bet-1:credit');
    expect(bet.cashedOutAt).toBe(cashedOutAt);
  });

  it('floors payout multiplier to cents of multiplier', () => {
    const bet = createBet();

    bet.accept({ debitOperationId: 'bet:bet-1:debit' });

    expect(
      bet.cashOut({
        multiplier: 1.239,
        creditOperationId: 'bet:bet-1:credit',
      }),
    ).toBe(1230n);
  });

  it('marks accepted bets as lost after crash', () => {
    const bet = createBet();
    const lostAt = new Date('2026-01-01T00:00:05.000Z');

    bet.accept({ debitOperationId: 'bet:bet-1:debit' });
    bet.lose({ lostAt });

    expect(bet.status).toBe(BetStatus.LOST);
    expect(bet.updatedAt).toBe(lostAt);
  });

  it('rejects invalid bet transitions', () => {
    const pendingBet = createBet();

    expect(() =>
      pendingBet.cashOut({
        multiplier: 2,
        creditOperationId: 'bet:bet-1:credit',
      }),
    ).toThrow();
    expect(() => pendingBet.lose()).toThrow();

    pendingBet.accept({ debitOperationId: 'bet:bet-1:debit' });

    expect(() =>
      pendingBet.reject({
        reason: BetRejectedReason.UNKNOWN,
      }),
    ).toThrow();

    pendingBet.cashOut({
      multiplier: 2,
      creditOperationId: 'bet:bet-1:credit',
    });

    expect(() =>
      pendingBet.cashOut({
        multiplier: 2,
        creditOperationId: 'bet:bet-1:credit-2',
      }),
    ).toThrow();
  });

  it('rejects bet amounts outside challenge limits', () => {
    expect(() =>
      Bet.createPending({
        id: 'bet-1',
        roundId: 'round-1',
        playerId: 'player-1',
        username: 'player',
        amountCents: 99n,
      }),
    ).toThrow();

    expect(() =>
      Bet.createPending({
        id: 'bet-1',
        roundId: 'round-1',
        playerId: 'player-1',
        username: 'player',
        amountCents: 100001n,
      }),
    ).toThrow();
  });

  it('rejects invalid cashout multipliers', () => {
    const bet = createBet();

    bet.accept({ debitOperationId: 'bet:bet-1:debit' });

    expect(() =>
      bet.cashOut({
        multiplier: 0.99,
        creditOperationId: 'bet:bet-1:credit',
      }),
    ).toThrow();
  });

  it('restores a persisted bet', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:05.000Z');

    const bet = Bet.restore({
      id: 'bet-1',
      roundId: 'round-1',
      playerId: 'player-1',
      username: 'player',
      amountCents: 1000n,
      status: BetStatus.CASHED_OUT,
      cashoutMultiplier: 2,
      payoutCents: 2000n,
      debitOperationId: 'bet:bet-1:debit',
      creditOperationId: 'bet:bet-1:credit',
      createdAt,
      updatedAt,
    });

    expect(bet.status).toBe(BetStatus.CASHED_OUT);
    expect(bet.payoutCents).toBe(2000n);
    expect(bet.createdAt).toBe(createdAt);
    expect(bet.updatedAt).toBe(updatedAt);
  });
});

function createBet(): Bet {
  return Bet.createPending({
    id: 'bet-1',
    roundId: 'round-1',
    playerId: 'player-1',
    username: 'player',
    amountCents: 1000n,
  });
}
