import { describe, expect, it, mock } from 'bun:test';
import type {
  WalletCreditFailed,
  WalletDebitFailed,
  WalletDebitSucceeded,
} from '@crash/shared/events';

import { WalletEventsHandler } from '../../src/application/sagas/wallet-events.handler';
import type { BetRepository } from '../../src/application/ports/bet-repository.port';
import { BetRejectedReason, BetStatus } from '../../src/domain/bet/bet-status.enum';
import type { EventBus } from '../../src/application/ports/event-bus.port';
import type { Clock } from '../../src/application/ports/clock.port';
import { Bet } from '../../src/domain/bet/bet.entity';

describe('WalletEventsHandler', () => {
  it('accepts a pending bet when wallet debit succeeds', async () => {
    const bet = createPendingBet();
    const deps = createDeps(bet);
    const handler = new WalletEventsHandler(deps.bets, deps.eventBus, deps.clock);

    await handler.handle(createDebitSucceededEvent());

    expect(bet.status).toBe(BetStatus.ACCEPTED);
    expect(bet.debitOperationId).toBe('bet:bet-1:debit');
    expect(deps.bets.save).toHaveBeenCalledWith(bet);
    expect(deps.eventBus.publish).toHaveBeenCalledWith('bet.accepted', {
      roundId: 'round-1',
      betId: 'bet-1',
      playerId: 'player-1',
      username: 'player',
      amountCents: '1000',
    });
  });

  it('rejects a pending bet when wallet debit fails', async () => {
    const bet = createPendingBet();
    const deps = createDeps(bet);
    const handler = new WalletEventsHandler(deps.bets, deps.eventBus, deps.clock);

    await handler.handle(createDebitFailedEvent());

    expect(bet.status).toBe(BetStatus.REJECTED);
    expect(bet.rejectedReason).toBe(BetRejectedReason.INSUFFICIENT_FUNDS);
    expect(deps.eventBus.publish).toHaveBeenCalledWith('bet.rejected', {
      roundId: 'round-1',
      betId: 'bet-1',
      playerId: 'player-1',
      username: 'player',
      amountCents: '1000',
      reason: BetRejectedReason.INSUFFICIENT_FUNDS,
    });
  });

  it('ignores duplicated debit events for already processed bets', async () => {
    const bet = createPendingBet();
    bet.accept({ debitOperationId: 'bet:bet-1:debit' });
    const deps = createDeps(bet);
    const handler = new WalletEventsHandler(deps.bets, deps.eventBus, deps.clock);

    await handler.handle(createDebitSucceededEvent());

    expect(deps.bets.save).not.toHaveBeenCalled();
    expect(deps.eventBus.publish).not.toHaveBeenCalled();
  });

  it('publishes a compensation signal when wallet credit fails', async () => {
    const deps = createDeps(null);
    const handler = new WalletEventsHandler(deps.bets, deps.eventBus, deps.clock);

    await handler.handle(createCreditFailedEvent());

    expect(deps.eventBus.publish).toHaveBeenCalledWith('bet.credit_failed', {
      operationId: 'bet:bet-1:credit',
      roundId: 'round-1',
      betId: 'bet-1',
      playerId: 'player-1',
      amountCents: '2500',
      reason: 'WALLET_NOT_FOUND',
    });
  });
});

function createDeps(bet: Bet | null): {
  bets: BetRepository;
  eventBus: EventBus;
  clock: Clock;
} {
  return {
    bets: {
      findById: mock(async () => bet),
      findByRoundIdAndPlayerId: mock(async () => null),
      findByPlayerId: mock(async () => []),
      findByRoundId: mock(async () => []),
      countByPlayerId: mock(async () => 0),
      save: mock(async () => undefined),
    },
    eventBus: {
      publish: mock(async () => undefined),
    },
    clock: {
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    },
  };
}

function createPendingBet(): Bet {
  return Bet.createPending({
    id: 'bet-1',
    roundId: 'round-1',
    playerId: 'player-1',
    username: 'player',
    amountCents: 1000n,
  });
}

function createDebitSucceededEvent(): WalletDebitSucceeded {
  return {
    eventId: 'event-1',
    type: 'wallet.debit.succeeded',
    version: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {
      operationId: 'bet:bet-1:debit',
      playerId: 'player-1',
      roundId: 'round-1',
      betId: 'bet-1',
      amountCents: '1000',
      balanceCents: '9000',
    },
  };
}

function createDebitFailedEvent(): WalletDebitFailed {
  return {
    eventId: 'event-2',
    type: 'wallet.debit.failed',
    version: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {
      operationId: 'bet:bet-1:debit',
      playerId: 'player-1',
      roundId: 'round-1',
      betId: 'bet-1',
      amountCents: '1000',
      reason: 'INSUFFICIENT_FUNDS',
    },
  };
}

function createCreditFailedEvent(): WalletCreditFailed {
  return {
    eventId: 'event-3',
    type: 'wallet.credit.failed',
    version: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {
      operationId: 'bet:bet-1:credit',
      playerId: 'player-1',
      roundId: 'round-1',
      betId: 'bet-1',
      amountCents: '2500',
      reason: 'WALLET_NOT_FOUND',
    },
  };
}
