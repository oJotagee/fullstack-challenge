import { Inject, Injectable } from '@nestjs/common';

import type { WalletRepository } from '../ports/wallet-repository.port';
import { WALLET_REPOSITORY } from '../ports/wallet-repository.port';
import { WalletNotFoundError } from './wallet-use-case.errors';
import { Money } from '@/domain/money/money.vo';

type CreditWalletInput = {
  playerId: string;
  amountCents: string;
  operationId: string;
  roundId: string;
  betId: string;
};

type CreditWalletOutput = {
  balanceCents: string;
};

@Injectable()
export class CreditWalletUseCase {
  constructor(@Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepository) {}

  async execute(input: CreditWalletInput): Promise<CreditWalletOutput> {
    const wallet = await this.wallets.findByPlayerId(input.playerId);

    // Creditos tambem sao comandos internos; nao sao expostos via REST.
    if (!wallet) {
      throw new WalletNotFoundError(input.playerId);
    }

    // O operationId impede que um evento repetido credite duas vezes.
    wallet.credit({
      entryId: crypto.randomUUID(),
      operationId: input.operationId,
      amount: Money.fromCents(input.amountCents),
      roundId: input.roundId,
      betId: input.betId,
      metadata: { source: 'wallet.credit.requested' },
    });

    await this.wallets.save(wallet);

    // Mantem o formato monetario dos eventos: centavos como string.
    return { balanceCents: wallet.balance.cents.toString() };
  }
}
