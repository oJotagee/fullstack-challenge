import { Wallet } from '@/domain/wallet/wallet.entity';

export const WALLET_REPOSITORY = Symbol('WALLET_REPOSITORY');

// Porta da aplicacao: os casos de uso dependem desta interface, nao do Prisma.
export interface WalletRepository {
  findByPlayerId(playerId: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
}
