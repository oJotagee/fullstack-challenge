'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAuthStore } from '@/features/auth/auth-store';
import { createWallet } from '@/features/wallet/wallet-api';
import { walletKeys, useMyWallet } from '@/features/wallet/wallet-query';
import { ApiError } from '@/lib/http-client';
import { centsToDecimal } from '@/lib/format-money';

export function PlayerSummary() {
  const queryClient = useQueryClient();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const { data: wallet, isLoading, isError } = useMyWallet();
  const [creating, setCreating] = useState(false);

  async function handleCreateWallet() {
    setCreating(true);
    try {
      await createWallet();
      await queryClient.invalidateQueries({ queryKey: walletKeys.me() });
      toast.success('Carteira criada!');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao criar carteira';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0F0F23] px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
      {/* Username */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#22C55E]/20 text-[#22C55E]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className="truncate font-mono text-xs text-white/80 sm:text-sm">{username}</span>
      </div>

      {/* Balance */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="text-right">
          <div className="text-[10px] text-white/30 font-mono tracking-widest">SALDO</div>
          {isLoading ? (
            <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06]" />
          ) : isError ? (
            <button
              type="button"
              onClick={() => void handleCreateWallet()}
              disabled={creating}
              className="text-[10px] font-mono text-[#F59E0B] hover:text-[#FBBF24] underline cursor-pointer disabled:opacity-50"
            >
              {creating ? 'Criando...' : 'Criar carteira'}
            </button>
          ) : (
            <div
              className="font-mono text-xs font-bold text-[#22C55E] sm:text-sm"
              style={{ textShadow: '0 0 10px rgba(34,197,94,0.4)' }}
            >
              $ {wallet ? centsToDecimal(wallet.balanceCents) : '—'}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-white/[0.06] p-1.5 text-white/30 hover:text-white/70 hover:border-white/20 transition-colors cursor-pointer"
          aria-label="Sair"
          title="Sair"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
