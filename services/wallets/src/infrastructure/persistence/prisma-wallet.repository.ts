import { Injectable } from '@nestjs/common';

import type { WalletRepository } from '@/application/ports/wallet-repository.port';
import { PrismaService } from '../prisma/prisma.service';
import { Wallet } from '@/domain/wallet/wallet.entity';
import { WalletMapper } from './wallet.mapper';

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    // Carrega o ledger junto para reconstruir saldo, historico e idempotencia.
    const wallet = await this.prisma.wallet.findUnique({
      where: { playerId },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!wallet) {
      return null;
    }

    return WalletMapper.toDomain(wallet);
  }

  async save(wallet: Wallet): Promise<void> {
    const persistence = WalletMapper.toPersistence(wallet);

    // Wallet e ledger sao gravados na mesma transacao para manter consistencia financeira.
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.upsert({
        where: { playerId: persistence.wallet.playerId },
        create: persistence.wallet,
        update: {
          balanceCents: persistence.wallet.balanceCents,
        },
      });

      if (persistence.ledgerEntries.length === 0) {
        return;
      }

      await tx.ledgerEntry.createMany({
        data: persistence.ledgerEntries,
        // O banco tambem protege operationId duplicado em mensagens reprocessadas.
        skipDuplicates: true,
      });
    });
  }
}
