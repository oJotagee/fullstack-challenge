import { Inject, Injectable } from '@nestjs/common';

import type { WalletRepository } from '../ports/wallet-repository.port';
import { WALLET_REPOSITORY } from '../ports/wallet-repository.port';
import { WalletNotFoundError } from './wallet-use-case.errors';

type GetMyWalletInput = {
  playerId: string;
};

type GetMyWalletOutput = {
  id: string;
  playerId: string;
  balanceCents: string;
};

@Injectable()
export class GetMyWalletUseCase {
  constructor(@Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepository) {}

  async execute(input: GetMyWalletInput): Promise<GetMyWalletOutput> {
    const wallet = await this.wallets.findByPlayerId(input.playerId);

    // A API /wallets/me só retorna saldo quando a carteira existe.
    if (!wallet) {
      throw new WalletNotFoundError(input.playerId);
    }

    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balanceCents: wallet.balance.cents.toString(),
    };
  }
}
