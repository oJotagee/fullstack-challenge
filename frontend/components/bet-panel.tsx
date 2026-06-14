'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { centsToDecimal, decimalToCents, multiplyCents } from '@/lib/format-money';
import { cashOut, getCurrentRound, placeBet } from '@/features/game/game-api';
import { useGameStore } from '@/features/game/game-store';
import { useMyWallet, walletKeys } from '@/features/wallet/wallet-query';
import { ApiError } from '@/lib/http-client';
import { playBetSound, playCashOutSound, unlockAudioFeedback } from '@/lib/audio-feedback';
import { useAuthStore } from '@/features/auth/auth-store';

export function BetPanel() {
  const queryClient = useQueryClient();
  const phase = useGameStore((s) => s.phase);
  const multiplier = useGameStore((s) => s.multiplier);
  const myBet = useGameStore((s) => s.myBet);
  const currentRound = useGameStore((s) => s.currentRound);

  const pendingBet = useGameStore((s) => s.pendingBet);
  const setPendingBet = useGameStore((s) => s.setPendingBet);

  const playerId = useAuthStore((s) => s.playerId);
  const setCurrentRound = useGameStore((s) => s.setCurrentRound);
  const { data: wallet } = useMyWallet();

  const [amount, setAmount] = useState('10.00');
  const [isPlacing, setIsPlacing] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll round when bet is PENDING_DEBIT to catch accepted status
  useEffect(() => {
    const isPending = myBet?.status === 'PENDING_DEBIT' && phase === 'RUNNING';
    if (isPending) {
      pollRef.current = setInterval(() => {
        getCurrentRound()
          .then((round) => setCurrentRound(round, playerId))
          .catch(() => {});
      }, 1000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [myBet?.status, phase, playerId, setCurrentRound]);

  // Countdown timer during BETTING phase
  useEffect(() => {
    if (phase === 'BETTING' && currentRound?.bettingEndsAt) {
      const tick = () => {
        const remaining = Math.max(
          0,
          Math.ceil((new Date(currentRound.bettingEndsAt!).getTime() - Date.now()) / 1000),
        );
        setCountdown(remaining);
      };
      tick();
      intervalRef.current = setInterval(tick, 500);
    } else {
      setCountdown(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, currentRound?.bettingEndsAt]);

  const betAmountCents = parseAmountCents(amount);
  const balanceCents = wallet ? BigInt(wallet.balanceCents) : null;
  const hasInsufficientBalance =
    betAmountCents !== null && balanceCents !== null && betAmountCents > balanceCents;
  const canEditBetAmount = phase === 'BETTING' && !myBet && !pendingBet && !isPlacing;

  const canBet = canEditBetAmount && betAmountCents !== null && !hasInsufficientBalance;

  const canCashOut =
    phase === 'RUNNING' &&
    (myBet?.status === 'ACCEPTED' || myBet?.status === 'PENDING_DEBIT') &&
    !isCashingOut;

  const potentialPayout =
    myBet?.status === 'ACCEPTED' && phase === 'RUNNING'
      ? centsToDecimal(multiplyCents(myBet.amountCents, multiplier))
      : null;

  async function handleBet() {
    if (!canBet) return;
    try {
      decimalToCents(amount); // validate format first
    } catch {
      toast.error('Valor inválido. Use formato: 10.00');
      return;
    }

    const cents = BigInt(decimalToCents(amount));
    if (cents < 100n) {
      toast.error('Aposta mínima: $ 1.00');
      return;
    }
    if (cents > 100000n) {
      toast.error('Aposta máxima: $ 1000.00');
      return;
    }
    if (balanceCents !== null && cents > balanceCents) {
      toast.error('Saldo insuficiente para essa aposta.');
      return;
    }

    unlockAudioFeedback();
    setIsPlacing(true);
    try {
      await placeBet({ amount });
      playBetSound();
      setPendingBet(true);
      void queryClient.invalidateQueries({ queryKey: walletKeys.me() });
      toast.success('Aposta registrada!');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao apostar';
      toast.error(msg);
    } finally {
      setIsPlacing(false);
    }
  }

  async function handleCashOut() {
    if (!canCashOut) return;
    unlockAudioFeedback();
    setIsCashingOut(true);
    try {
      const result = await cashOut();
      playCashOutSound();
      void queryClient.invalidateQueries({ queryKey: walletKeys.me() });
      toast.success(
        `Cash out! Ganhou $ ${centsToDecimal(result.payoutCents)} @ ${result.multiplier}x`,
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao sacar';
      toast.error(msg);
    } finally {
      setIsCashingOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#0F0F23] p-3 sm:gap-4 sm:p-4">
      {/* Amount input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bet-amount" className="text-xs text-white/40 font-mono">
          VALOR DA APOSTA ($)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 font-mono text-sm">
            $
          </span>
          <input
            id="bet-amount"
            type="number"
            min="1"
            max="1000"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!canEditBetAmount}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2.5 pl-7 pr-3 font-mono text-base text-white transition-colors focus:border-[#22C55E]/50 focus:outline-none focus:ring-1 focus:ring-[#22C55E]/30 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            aria-label="Valor da aposta"
          />
        </div>

        {hasInsufficientBalance && (
          <p className="text-xs text-[#EF4444] font-mono">
            Saldo insuficiente para apostar $ {centsToDecimal(betAmountCents ?? 0n)}.
          </p>
        )}

        {/* Quick amounts */}
        <div className="grid grid-cols-5 gap-1.5">
          {['5', '10', '25', '50', '100'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(v + '.00')}
              disabled={!canEditBetAmount}
              className="min-w-0 rounded-md border border-white/[0.06] bg-white/[0.03] py-1.5 font-mono text-xs text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Countdown */}
      {phase === 'BETTING' && countdown !== null && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/5 px-3 py-2">
          <span className="text-xs text-white/40 font-mono">INÍCIO EM</span>
          <span
            className="text-lg font-black text-[#22C55E] font-mono"
            style={{ textShadow: '0 0 10px rgba(34,197,94,0.5)' }}
          >
            {countdown}s
          </span>
        </div>
      )}

      {/* Potential payout */}
      {potentialPayout && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/5 px-3 py-2">
          <span className="text-xs text-white/40 font-mono">PAYOUT ESTIMADO</span>
          <span
            className="shrink-0 font-mono text-sm font-bold text-[#22C55E]"
            style={{ textShadow: '0 0 8px rgba(34,197,94,0.4)' }}
          >
            $ {potentialPayout}
          </span>
        </div>
      )}

      {/* Bet button */}
      <button
        type="button"
        onClick={() => void handleBet()}
        disabled={!canBet}
        className="relative w-full overflow-hidden rounded-xl py-3 font-mono text-sm font-bold text-black transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
        style={{
          background: canBet
            ? 'linear-gradient(135deg, #22C55E, #16A34A)'
            : 'rgba(255,255,255,0.05)',
          boxShadow: canBet ? '0 0 20px rgba(34,197,94,0.3)' : 'none',
          color: canBet ? '#000' : 'rgba(255,255,255,0.3)',
        }}
      >
        {isPlacing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
            Apostando...
          </span>
        ) : (
          'APOSTAR'
        )}
      </button>

      {/* Cash out button */}
      <button
        type="button"
        onClick={() => void handleCashOut()}
        disabled={!canCashOut}
        className="relative w-full overflow-hidden rounded-xl py-3 font-mono text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
        style={{
          background: canCashOut
            ? 'linear-gradient(135deg, #F59E0B, #D97706)'
            : 'rgba(255,255,255,0.05)',
          boxShadow: canCashOut ? '0 0 20px rgba(245,158,11,0.3)' : 'none',
          color: canCashOut ? '#000' : 'rgba(255,255,255,0.3)',
        }}
      >
        {isCashingOut ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
            Sacando...
          </span>
        ) : potentialPayout ? (
          `SACAR $ ${potentialPayout}`
        ) : (
          'SACAR'
        )}
      </button>

      {/* My bet status */}
      {myBet && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-mono">MINHA APOSTA</span>
            <BetStatusBadge status={myBet.status} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-sm text-white font-mono">
              $ {centsToDecimal(myBet.amountCents)}
            </span>
            {myBet.payoutCents && (
              <span className="shrink-0 font-mono text-sm text-[#22C55E]">
                → $ {centsToDecimal(myBet.payoutCents)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BetStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING_DEBIT: { label: 'PENDENTE', color: '#F59E0B' },
    ACCEPTED: { label: 'ATIVO', color: '#22C55E' },
    CASHED_OUT: { label: 'SACOU', color: '#22C55E' },
    LOST: { label: 'PERDEU', color: '#EF4444' },
    REJECTED: { label: 'REJEITADO', color: '#EF4444' },
  };
  const s = map[status] ?? { label: status, color: '#fff' };
  return (
    <span
      className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
      style={{ color: s.color, background: `${s.color}20` }}
    >
      {s.label}
    </span>
  );
}

function parseAmountCents(amount: string): bigint | null {
  try {
    return BigInt(decimalToCents(amount));
  } catch {
    return null;
  }
}
