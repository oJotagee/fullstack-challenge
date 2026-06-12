import { Inject, Injectable } from '@nestjs/common';

import type { WalletRepository } from '../ports/wallet-repository.port';
import { WALLET_REPOSITORY } from '../ports/wallet-repository.port';
import { WalletNotFoundError } from './wallet-use-case.errors';
import { DuplicatedWalletOperationError } from '@/domain/wallet/wallet.errors';
import { Money } from '@/domain/money/money.vo';

type DebitWalletInput = {
  playerId: string;
  amountCents: string;
  operationId: string;
  roundId: string;
  betId: string;
  idempotent?: boolean;
};

type DebitWalletOutput = {
  balanceCents: string;
};

@Injectable()
export class DebitWalletUseCase {
  constructor(@Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepository) {}

  async execute(input: DebitWalletInput): Promise<DebitWalletOutput> {
    const wallet = await this.wallets.findByPlayerId(input.playerId);

    // Debitos chegam por mensageria; sem wallet, a aplicacao deve falhar explicitamente.
    if (!wallet) {
      throw new WalletNotFoundError(input.playerId);
    }

    // O dominio valida saldo, valor positivo e idempotencia por operationId.
    try {
      wallet.debit({
        entryId: crypto.randomUUID(),
        operationId: input.operationId,
        amount: Money.fromCents(input.amountCents),
        roundId: input.roundId,
        betId: input.betId,
        metadata: { source: 'wallet.debit.requested' },
      });
    } catch (error) {
      if (!input.idempotent || !(error instanceof DuplicatedWalletOperationError)) {
        throw error;
      }
    }

    await this.wallets.save(wallet);

    // O saldo sai como centavos em string, igual aos contratos compartilhados.
    return { balanceCents: wallet.balance.cents.toString() };
  }
}
