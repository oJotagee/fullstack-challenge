import type {
  LedgerEntry as PrismaLedgerEntry,
  Wallet as PrismaWallet,
} from '@generated/prisma/client';

import { LedgerEntry, LedgerEntryMetadata } from '@/domain/wallet/ledger-entry.entity';
import { LedgerEntryType } from '@/domain/wallet/ledger-entry-type.enum';
import { Wallet } from '@/domain/wallet/wallet.entity';
import { Money } from '@/domain/money/money.vo';

type PrismaWalletWithLedger = PrismaWallet & {
  ledgerEntries: PrismaLedgerEntry[];
};

type PersistableWallet = {
  id: string;
  playerId: string;
  balanceCents: bigint;
};

type PersistableLedgerEntry = {
  id: string;
  walletId: string;
  operationId: string;
  roundId?: string;
  betId?: string;
  type: LedgerEntryType;
  amountCents: bigint;
  balanceAfterCents: bigint;
  metadata?: LedgerEntryMetadata;
  createdAt: Date;
};

export class WalletMapper {
  static toDomain(wallet: PrismaWalletWithLedger): Wallet {
    // Converte modelos do Prisma para entidades de dominio sem vazar ORM para o core.
    return Wallet.restore({
      id: wallet.id,
      playerId: wallet.playerId,
      balance: Money.fromCents(wallet.balanceCents),
      ledgerEntries: wallet.ledgerEntries.map((entry) =>
        LedgerEntry.create({
          id: entry.id,
          walletId: entry.walletId,
          operationId: entry.operationId,
          type: entry.type as LedgerEntryType,
          amount: Money.fromCents(entry.amountCents),
          balanceAfter: Money.fromCents(entry.balanceAfterCents),
          roundId: entry.roundId ?? undefined,
          betId: entry.betId ?? undefined,
          metadata: this.toLedgerMetadata(entry.metadata),
          createdAt: entry.createdAt,
        }),
      ),
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    });
  }

  static toPersistence(wallet: Wallet): {
    wallet: PersistableWallet;
    ledgerEntries: PersistableLedgerEntry[];
  } {
    // Converte o agregado para dados simples que o repository consegue persistir.
    return {
      wallet: {
        id: wallet.id,
        playerId: wallet.playerId,
        balanceCents: wallet.balance.cents,
      },
      ledgerEntries: wallet.ledgerEntries.map((entry) => ({
        id: entry.id,
        walletId: entry.walletId,
        operationId: entry.operationId,
        roundId: entry.roundId,
        betId: entry.betId,
        type: entry.type,
        amountCents: entry.amount.cents,
        balanceAfterCents: entry.balanceAfter.cents,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      })),
    };
  }

  private static toLedgerMetadata(value: unknown): LedgerEntryMetadata | undefined {
    // Metadata do Prisma vem como JSON; o dominio aceita apenas valores simples.
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(value).filter(
        ([, entryValue]) =>
          ['string', 'number', 'boolean'].includes(typeof entryValue) || entryValue === null,
      ),
    ) as LedgerEntryMetadata;
  }
}
