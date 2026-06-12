import { Inject, Injectable } from '@nestjs/common';
import type { WalletCreditRequested, WalletDebitRequested } from '@crash/shared/events';

import { EVENT_BUS, type EventBus } from '../ports/event-bus.port';
import { CreditWalletUseCase } from '../use-cases/credit-wallet.use-case';
import { WalletNotFoundError } from '../use-cases/wallet-use-case.errors';
import { DebitWalletUseCase } from '../use-cases/debit-wallet.use-case';
import { InsufficientFundsError } from '@/domain/wallet/wallet.errors';

type WalletCommandEvent = WalletDebitRequested | WalletCreditRequested;

@Injectable()
export class WalletCommandEventsHandler {
  constructor(
    private readonly debitWallet: DebitWalletUseCase,
    private readonly creditWallet: CreditWalletUseCase,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async handle(event: WalletCommandEvent): Promise<void> {
    if (event.type === 'wallet.debit.requested') {
      await this.handleDebitRequested(event);
      return;
    }

    await this.handleCreditRequested(event);
  }

  private async handleDebitRequested(event: WalletDebitRequested): Promise<void> {
    try {
      const output = await this.debitWallet.execute({
        ...event.payload,
        idempotent: true,
      });

      await this.eventBus.publish('wallet.debit.succeeded', {
        ...event.payload,
        balanceCents: output.balanceCents,
      });
    } catch (error) {
      await this.eventBus.publish('wallet.debit.failed', {
        ...event.payload,
        reason: mapDebitFailureReason(error),
      });
    }
  }

  private async handleCreditRequested(event: WalletCreditRequested): Promise<void> {
    try {
      const output = await this.creditWallet.execute({
        ...event.payload,
        idempotent: true,
      });

      await this.eventBus.publish('wallet.credit.succeeded', {
        ...event.payload,
        balanceCents: output.balanceCents,
      });
    } catch (error) {
      await this.eventBus.publish('wallet.credit.failed', {
        ...event.payload,
        reason: mapCreditFailureReason(error),
      });
    }
  }
}

function mapDebitFailureReason(
  error: unknown,
): 'INSUFFICIENT_FUNDS' | 'WALLET_NOT_FOUND' | 'UNKNOWN' {
  if (error instanceof InsufficientFundsError) {
    return 'INSUFFICIENT_FUNDS';
  }

  if (error instanceof WalletNotFoundError) {
    return 'WALLET_NOT_FOUND';
  }

  return 'UNKNOWN';
}

function mapCreditFailureReason(error: unknown): 'WALLET_NOT_FOUND' | 'UNKNOWN' {
  if (error instanceof WalletNotFoundError) {
    return 'WALLET_NOT_FOUND';
  }

  return 'UNKNOWN';
}
