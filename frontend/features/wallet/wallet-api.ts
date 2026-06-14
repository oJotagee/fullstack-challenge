import { api } from '@/lib/http-client';

export interface WalletResponse {
  id: string;
  playerId: string;
  balanceCents: string;
}

export function getMyWallet(): Promise<WalletResponse> {
  return api<WalletResponse>('/wallets/me');
}

export function createWallet(): Promise<WalletResponse> {
  return api<WalletResponse>('/wallets', { method: 'POST' });
}
