'use client';

import { useAuthStore } from '@/features/auth/auth-store';
import { useGameStore } from '@/features/game/game-store';
import { centsToDecimal } from '@/lib/format-money';

export function CurrentBetsList() {
  const bets = useGameStore((s) => s.bets);
  const myPlayerId = useAuthStore((s) => s.playerId);

  if (bets.length === 0) {
    return (
      <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#0F0F23]">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-xs font-bold text-white/40 font-mono tracking-widest">
            APOSTAS DA RODADA
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-white/20 font-mono">Nenhuma aposta ainda</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#0F0F23] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h2 className="text-xs font-bold text-white/40 font-mono tracking-widest">
          APOSTAS DA RODADA
        </h2>
        <span className="text-xs text-white/30 font-mono">
          {bets.length} jogador{bets.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 text-[10px] text-white/20 font-mono border-b border-white/[0.04]">
        <span>JOGADOR</span>
        <span className="text-right">APOSTA</span>
        <span className="text-right w-20">STATUS</span>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto max-h-64 divide-y divide-white/[0.04]">
        {bets.map((bet) => {
          const isMe = bet.playerId === myPlayerId;
          const isCashedOut = bet.status === 'CASHED_OUT';
          const isLost = bet.status === 'LOST';

          return (
            <div
              key={bet.id}
              className={`grid grid-cols-[1fr_auto_auto] gap-2 items-center px-4 py-2.5 transition-colors ${
                isMe ? 'bg-[#22C55E]/5' : ''
              } ${isCashedOut ? 'bg-[#22C55E]/8' : ''}`}
            >
              {/* Username */}
              <div className="flex items-center gap-1.5 min-w-0">
                {isMe && (
                  <span className="text-[9px] font-bold text-[#22C55E] font-mono shrink-0">
                    YOU
                  </span>
                )}
                <span
                  className={`text-xs font-mono truncate ${isMe ? 'text-[#22C55E]' : 'text-white/70'}`}
                >
                  {bet.username}
                </span>
              </div>

              {/* Amount */}
              <span className="text-xs font-mono text-white/60 text-right">
                $ {centsToDecimal(bet.amountCents)}
              </span>

              {/* Status / payout */}
              <div className="text-right w-20">
                {isCashedOut ? (
                  <div className="flex flex-col items-end">
                    <span
                      className="text-[10px] font-bold font-mono text-[#22C55E]"
                      style={{ textShadow: '0 0 8px rgba(34,197,94,0.4)' }}
                    >
                      {bet.cashoutMultiplier}x
                    </span>
                    {bet.payoutCents && (
                      <span className="text-[9px] font-mono text-[#22C55E]/60">
                        $ {centsToDecimal(bet.payoutCents)}
                      </span>
                    )}
                  </div>
                ) : isLost ? (
                  <span className="text-[10px] font-bold font-mono text-[#EF4444]/70">PERDEU</span>
                ) : (
                  <span className="text-[10px] font-mono text-white/20">
                    {bet.status === 'ACCEPTED' ? 'ATIVO' : 'PENDENTE'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
