import { DuplicatedWalletOperationError, InvalidMoneyError } from './wallet.errors';
import { WalletCreditedEvent } from '../events/wallet-credited.event';
import { WalletDebitedEvent } from '../events/wallet-debited.event';
import { LedgerEntryType } from './ledger-entry-type.enum';
import { LedgerEntry } from './ledger-entry.entity';
import { Money } from '../money/money.vo';

export type WalletDomainEvent = WalletCreditedEvent | WalletDebitedEvent;

type WalletProps = {
  id: string;
  playerId: string;
  balance: Money;
  ledgerEntries: LedgerEntry[];
  processedOperationIds: Set<string>;
  createdAt: Date;
  updatedAt: Date;
};

type WalletOperationInput = {
  entryId: string;
  operationId: string;
  amount: Money;
  roundId?: string;
  betId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  occurredAt?: Date;
};

export class Wallet {
  private readonly domainEvents: WalletDomainEvent[] = [];

  private constructor(private readonly props: WalletProps) {}

  // Carteiras novas podem iniciar com saldo zero; movimentacao acontece pelo ledger.
  static create(input: {
    id: string;
    playerId: string;
    initialBalance?: Money;
    createdAt?: Date;
  }): Wallet {
    const now = input.createdAt ?? new Date();

    return new Wallet({
      id: input.id,
      playerId: input.playerId,
      balance: input.initialBalance ?? Money.fromCents(0n),
      ledgerEntries: [],
      processedOperationIds: new Set(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(input: {
    id: string;
    playerId: string;
    balance: Money;
    ledgerEntries: LedgerEntry[];
    createdAt: Date;
    updatedAt: Date;
  }): Wallet {
    // Carteiras restauradas reconstroem a idempotencia a partir do ledger persistido.
    return new Wallet({
      ...input,
      processedOperationIds: new Set(input.ledgerEntries.map((entry) => entry.operationId)),
    });
  }

  debit(input: WalletOperationInput): LedgerEntry {
    // Debito precisa ser idempotente e positivo antes de alterar o saldo.
    this.ensureOperationWasNotProcessed(input.operationId);
    this.ensurePositiveAmount(input.amount);

    const balanceAfter = this.props.balance.subtract(input.amount);
    this.props.balance = balanceAfter;
    this.props.updatedAt = input.occurredAt ?? new Date();

    const entry = this.recordLedgerEntry({
      ...input,
      type: LedgerEntryType.DEBIT,
      balanceAfter,
    });

    this.domainEvents.push({
      type: 'wallet.debited',
      occurredAt: entry.createdAt,
      payload: {
        operationId: input.operationId,
        walletId: this.id,
        playerId: this.playerId,
        roundId: input.roundId,
        betId: input.betId,
        amountCents: input.amount.cents.toString(),
        balanceCents: balanceAfter.cents.toString(),
      },
    });

    return entry;
  }

  credit(input: WalletOperationInput): LedgerEntry {
    // Credito usa a mesma trava por operationId para evitar credito duplicado.
    this.ensureOperationWasNotProcessed(input.operationId);
    this.ensurePositiveAmount(input.amount);

    const balanceAfter = this.props.balance.add(input.amount);
    this.props.balance = balanceAfter;
    this.props.updatedAt = input.occurredAt ?? new Date();

    const entry = this.recordLedgerEntry({
      ...input,
      type: LedgerEntryType.CREDIT,
      balanceAfter,
    });

    this.domainEvents.push({
      type: 'wallet.credited',
      occurredAt: entry.createdAt,
      payload: {
        operationId: input.operationId,
        walletId: this.id,
        playerId: this.playerId,
        roundId: input.roundId,
        betId: input.betId,
        amountCents: input.amount.cents.toString(),
        balanceCents: balanceAfter.cents.toString(),
      },
    });

    return entry;
  }

  pullDomainEvents(): WalletDomainEvent[] {
    // A aplicacao coleta e publica estes eventos depois de salvar a wallet.
    return this.domainEvents.splice(0, this.domainEvents.length);
  }

  get id(): string {
    return this.props.id;
  }

  get playerId(): string {
    return this.props.playerId;
  }

  get balance(): Money {
    return this.props.balance;
  }

  get ledgerEntries(): readonly LedgerEntry[] {
    return this.props.ledgerEntries;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private ensureOperationWasNotProcessed(operationId: string): void {
    // O operationId e a chave de idempotencia dos comandos assincronos da wallet.
    if (this.props.processedOperationIds.has(operationId)) {
      throw new DuplicatedWalletOperationError(operationId);
    }
  }

  private ensurePositiveAmount(amount: Money): void {
    // Uma operacao de valor zero geraria lancamentos financeiros enganosos.
    if (amount.cents <= 0n) {
      throw new InvalidMoneyError('Wallet operation amount must be greater than zero.');
    }
  }

  private recordLedgerEntry(
    input: WalletOperationInput & {
      type: LedgerEntryType;
      balanceAfter: Money;
    },
  ): LedgerEntry {
    // Cada movimentacao financeira aceita gera exatamente um lancamento no ledger.
    const entry = LedgerEntry.create({
      id: input.entryId,
      walletId: this.id,
      operationId: input.operationId,
      type: input.type,
      amount: input.amount,
      balanceAfter: input.balanceAfter,
      roundId: input.roundId,
      betId: input.betId,
      metadata: input.metadata,
      createdAt: input.occurredAt,
    });

    this.props.ledgerEntries.push(entry);
    this.props.processedOperationIds.add(input.operationId);

    return entry;
  }
}
