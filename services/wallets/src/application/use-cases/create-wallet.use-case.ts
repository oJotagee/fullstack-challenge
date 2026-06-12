import { Inject, Injectable } from '@nestjs/common';

import type { WalletRepository } from '../ports/wallet-repository.port';
import { WALLET_REPOSITORY } from '../ports/wallet-repository.port';
import { Wallet } from '@/domain/wallet/wallet.entity';

type CreateWalletInput = {
  playerId: string;
};

type WalletOutput = {
  id: string;
  playerId: string;
  balanceCents: string;
};

@Injectable()
export class CreateWalletUseCase {
  constructor(@Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepository) {}

  async execute(input: CreateWalletInput): Promise<WalletOutput> {
    const existingWallet = await this.wallets.findByPlayerId(input.playerId);

    // Criar carteira deve ser idempotente para o mesmo jogador.
    if (existingWallet) {
      return this.toOutput(existingWallet);
    }

    const wallet = Wallet.create({
      id: crypto.randomUUID(),
      playerId: input.playerId,
    });

    await this.wallets.save(wallet);

    return this.toOutput(wallet);
  }

  private toOutput(wallet: Wallet): WalletOutput {
    // API e eventos expõem centavos como string para preservar precisao.
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balanceCents: wallet.balance.cents.toString(),
    };
  }
}
