import { LedgerEntryType } from './ledger-entry-type.enum';
import { Money } from '../money/money.vo';

export type LedgerEntryMetadata = Record<string, string | number | boolean | null>;

export type LedgerEntryProps = {
  id: string;
  walletId: string;
  operationId: string;
  type: LedgerEntryType;
  amount: Money;
  balanceAfter: Money;
  roundId?: string;
  betId?: string;
  metadata?: LedgerEntryMetadata;
  createdAt: Date;
};

export class LedgerEntry {
  private constructor(private readonly props: LedgerEntryProps) {}

  static create(props: Omit<LedgerEntryProps, 'createdAt'> & { createdAt?: Date }): LedgerEntry {
    // Lancamentos de ledger sao registros financeiros imutaveis para persistencia e auditoria.
    return new LedgerEntry({
      ...props,
      createdAt: props.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get walletId(): string {
    return this.props.walletId;
  }

  get operationId(): string {
    return this.props.operationId;
  }

  get type(): LedgerEntryType {
    return this.props.type;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get balanceAfter(): Money {
    return this.props.balanceAfter;
  }

  get roundId(): string | undefined {
    return this.props.roundId;
  }

  get betId(): string | undefined {
    return this.props.betId;
  }

  get metadata(): LedgerEntryMetadata | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
