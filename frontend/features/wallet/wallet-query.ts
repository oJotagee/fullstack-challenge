import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/auth-store';

import { getMyWallet, type WalletResponse } from './wallet-api';

export const walletKeys = {
  me: () => ['wallet', 'me'] as const,
};

export function useMyWallet() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<WalletResponse>({
    queryKey: walletKeys.me(),
    queryFn: getMyWallet,
    enabled: isAuthenticated,
    staleTime: 10_000,
    retry: false,
  });
}
