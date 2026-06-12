import { Inject, Injectable } from '@nestjs/common';

import type {
  WalletCreditFailed,
  WalletDebitFailed,
  WalletDebitSucceeded,
} from '@crash/shared/events';

import { BET_REPOSITORY, type BetRepository } from '../ports/bet-repository.port';
import { BetRejectedReason, BetStatus } from '@/domain/bet/bet-status.enum';
import { EVENT_BUS, type EventBus } from '../ports/event-bus.port';
import { CLOCK, type Clock } from '../ports/clock.port';

type WalletEvent = WalletDebitSucceeded | WalletDebitFailed | WalletCreditFailed;

@Injectable()
export class WalletEventsHandler {
  constructor(
    @Inject(BET_REPOSITORY) private readonly bets: BetRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async handle(event: WalletEvent): Promise<void> {
    if (event.type === 'wallet.debit.succeeded') {
      await this.handleDebitSucceeded(event);
      return;
    }

    if (event.type === 'wallet.debit.failed') {
      await this.handleDebitFailed(event);
      return;
    }

    await this.handleCreditFailed(event);
  }

  private async handleDebitSucceeded(event: WalletDebitSucceeded): Promise<void> {
    const bet = await this.bets.findById(event.payload.betId);

    if (!bet) {
      return;
    }

    // Eventos repetidos do broker nao podem mudar uma bet ja processada.
    if (bet.status !== BetStatus.PENDING_DEBIT) {
      return;
    }

    bet.accept({
      debitOperationId: event.payload.operationId,
      acceptedAt: this.clock.now(),
    });

    await this.bets.save(bet);
    await this.eventBus.publish('bet.accepted', {
      roundId: bet.roundId,
      betId: bet.id,
      playerId: bet.playerId,
      username: bet.username,
      amountCents: bet.amountCents.toString(),
    });
  }

  private async handleDebitFailed(event: WalletDebitFailed): Promise<void> {
    const bet = await this.bets.findById(event.payload.betId);

    if (!bet) {
      return;
    }

    if (bet.status !== BetStatus.PENDING_DEBIT) {
      return;
    }

    bet.reject({
      reason: mapDebitFailureReason(event.payload.reason),
      rejectedAt: this.clock.now(),
    });

    await this.bets.save(bet);
    await this.eventBus.publish('bet.rejected', {
      roundId: bet.roundId,
      betId: bet.id,
      playerId: bet.playerId,
      username: bet.username,
      amountCents: bet.amountCents.toString(),
      reason: bet.rejectedReason ?? BetRejectedReason.UNKNOWN,
    });
  }

  private async handleCreditFailed(event: WalletCreditFailed): Promise<void> {
    // O cash out ja travou a bet como CASHED_OUT; a falha fica visivel para futura compensacao.
    await this.eventBus.publish('bet.credit_failed', {
      operationId: event.payload.operationId,
      roundId: event.payload.roundId,
      betId: event.payload.betId,
      playerId: event.payload.playerId,
      amountCents: event.payload.amountCents,
      reason: event.payload.reason,
    });
  }
}

function mapDebitFailureReason(reason: WalletDebitFailed['payload']['reason']): BetRejectedReason {
  if (reason === 'INSUFFICIENT_FUNDS') {
    return BetRejectedReason.INSUFFICIENT_FUNDS;
  }

  return BetRejectedReason.UNKNOWN;
}
