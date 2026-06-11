import type { EventEnvelope } from './event-envelope';

export type WalletDebitRequested = EventEnvelope<
  'wallet.debit.requested',
  {
    operationId: string;
    playerId: string;
    roundId: string;
    betId: string;
    amountCents: string;
  }
>;

export type WalletDebitSucceeded = EventEnvelope<
  'wallet.debit.succeeded',
  {
    operationId: string;
    playerId: string;
    roundId: string;
    betId: string;
    amountCents: string;
    balanceCents: string;
  }
>;

export type WalletDebitFailed = EventEnvelope<
  'wallet.debit.failed',
  {
    operationId: string;
    playerId: string;
    roundId: string;
    betId: string;
    amountCents: string;
    reason: 'INSUFFICIENT_FUNDS' | 'WALLET_NOT_FOUND' | 'UNKNOWN';
  }
>;

export type WalletCreditRequested = EventEnvelope<
  'wallet.credit.requested',
  {
    operationId: string;
    playerId: string;
    roundId: string;
    betId: string;
    amountCents: string;
  }
>;

export type WalletCreditSucceeded = EventEnvelope<
  'wallet.credit.succeeded',
  {
    operationId: string;
    playerId: string;
    roundId: string;
    betId: string;
    amountCents: string;
    balanceCents: string;
  }
>;

export type WalletEvent =
  | WalletDebitRequested
  | WalletDebitSucceeded
  | WalletDebitFailed
  | WalletCreditRequested
  | WalletCreditSucceeded;
