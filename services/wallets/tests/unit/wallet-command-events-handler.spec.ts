import { describe, expect, it, mock } from 'bun:test';
import type { WalletCreditRequested, WalletDebitRequested } from '@crash/shared/events';

import { WalletCommandEventsHandler } from '../../src/application/handlers/wallet-command-events.handler';
import type { CreditWalletUseCase } from '../../src/application/use-cases/credit-wallet.use-case';
import type { DebitWalletUseCase } from '../../src/application/use-cases/debit-wallet.use-case';
import { WalletNotFoundError } from '../../src/application/use-cases/wallet-use-case.errors';
import { InsufficientFundsError } from '../../src/domain/wallet/wallet.errors';
import type { EventBus } from '../../src/application/ports/event-bus.port';

describe('WalletCommandEventsHandler', () => {
  it('publishes wallet.debit.succeeded after debit command succeeds', async () => {
    const deps = createDeps();
    const handler = new WalletCommandEventsHandler(
      deps.debitWallet,
      deps.creditWallet,
      deps.eventBus,
    );
    const event = createDebitRequestedEvent();

    await handler.handle(event);

    expect(deps.debitWallet.execute).toHaveBeenCalledWith({
      ...event.payload,
      idempotent: true,
    });
    expect(deps.eventBus.publish).toHaveBeenCalledWith('wallet.debit.succeeded', {
      ...event.payload,
      balanceCents: '9000',
    });
  });

  it('publishes wallet.debit.failed when debit command fails', async () => {
    const deps = createDeps({
      debitError: new InsufficientFundsError(),
    });
    const handler = new WalletCommandEventsHandler(
      deps.debitWallet,
      deps.creditWallet,
      deps.eventBus,
    );
    const event = createDebitRequestedEvent();

    await handler.handle(event);

    expect(deps.eventBus.publish).toHaveBeenCalledWith('wallet.debit.failed', {
      ...event.payload,
      reason: 'INSUFFICIENT_FUNDS',
    });
  });

  it('publishes wallet.credit.succeeded after credit command succeeds', async () => {
    const deps = createDeps();
    const handler = new WalletCommandEventsHandler(
      deps.debitWallet,
      deps.creditWallet,
      deps.eventBus,
    );
    const event = createCreditRequestedEvent();

    await handler.handle(event);

    expect(deps.creditWallet.execute).toHaveBeenCalledWith({
      ...event.payload,
      idempotent: true,
    });
    expect(deps.eventBus.publish).toHaveBeenCalledWith('wallet.credit.succeeded', {
      ...event.payload,
      balanceCents: '12500',
    });
  });

  it('publishes wallet.credit.failed when wallet does not exist', async () => {
    const deps = createDeps({
      creditError: new WalletNotFoundError('player-1'),
    });
    const handler = new WalletCommandEventsHandler(
      deps.debitWallet,
      deps.creditWallet,
      deps.eventBus,
    );
    const event = createCreditRequestedEvent();

    await handler.handle(event);

    expect(deps.eventBus.publish).toHaveBeenCalledWith('wallet.credit.failed', {
      ...event.payload,
      reason: 'WALLET_NOT_FOUND',
    });
  });
});

function createDeps(input: { debitError?: Error; creditError?: Error } = {}): {
  debitWallet: DebitWalletUseCase;
  creditWallet: CreditWalletUseCase;
  eventBus: EventBus & { publish: ReturnType<typeof mock> };
} {
  return {
    debitWallet: {
      execute: mock(async () => {
        if (input.debitError) {
          throw input.debitError;
        }

        return { balanceCents: '9000' };
      }),
    } as unknown as DebitWalletUseCase,
    creditWallet: {
      execute: mock(async () => {
        if (input.creditError) {
          throw input.creditError;
        }

        return { balanceCents: '12500' };
      }),
    } as unknown as CreditWalletUseCase,
    eventBus: {
      publish: mock(async () => undefined),
    },
  };
}

function createDebitRequestedEvent(): WalletDebitRequested {
  return {
    eventId: 'event-1',
    type: 'wallet.debit.requested',
    version: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {
      operationId: 'bet:bet-1:debit',
      playerId: 'player-1',
      roundId: 'round-1',
      betId: 'bet-1',
      amountCents: '1000',
    },
  };
}

function createCreditRequestedEvent(): WalletCreditRequested {
  return {
    eventId: 'event-2',
    type: 'wallet.credit.requested',
    version: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {
      operationId: 'bet:bet-1:credit',
      playerId: 'player-1',
      roundId: 'round-1',
      betId: 'bet-1',
      amountCents: '2500',
    },
  };
}
