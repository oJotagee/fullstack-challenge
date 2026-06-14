'use client';

import { useState } from 'react';

import { VerifyRoundDialog } from '@/features/game/verify-round-dialog';
import { useGameStore } from '@/features/game/game-store';

function crashColor(point: string | number): { text: string; bg: string; glow: string } {
  const v = parseFloat(String(point));
  if (v < 1.5) return { text: '#EF4444', bg: 'rgba(239,68,68,0.12)', glow: 'rgba(239,68,68,0.3)' };
  if (v < 2) return { text: '#F97316', bg: 'rgba(249,115,22,0.12)', glow: 'rgba(249,115,22,0.3)' };
  if (v < 5) return { text: '#22C55E', bg: 'rgba(34,197,94,0.12)', glow: 'rgba(34,197,94,0.3)' };
  return { text: '#A78BFA', bg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.3)' };
}

export function RoundHistory() {
  const history = useGameStore((s) => s.roundHistory);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const validHistory = history.filter(
    (round) => round && Number.isFinite(Number(round.crashPoint)),
  );

  if (validHistory.length === 0) {
    return (
      <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#0F0F23]">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-xs font-bold text-white/40 font-mono tracking-widest">HISTÓRICO</h2>
        </div>
        <div className="flex items-center justify-center px-4 py-6 text-center">
          <span className="text-xs text-white/20 font-mono">Nenhuma rodada ainda</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#0F0F23] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-xs font-bold text-white/40 font-mono tracking-widest">HISTÓRICO</h2>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3 min-[420px]:grid-cols-4 sm:flex sm:flex-wrap">
          {validHistory.map((round) => {
            const c = crashColor(round.crashPoint);
            return (
              <button
                key={round.id}
                type="button"
                onClick={() => setVerifyId(round.id)}
                className="min-w-0 rounded-lg px-2 py-1.5 font-mono text-xs font-bold transition-all duration-150 active:scale-95 sm:px-3"
                style={{
                  color: c.text,
                  background: c.bg,
                  boxShadow: `0 0 8px ${c.glow}`,
                }}
                title={`Rodada ${round.id} — ${round.crashPoint}x — clique para verificar`}
              >
                {parseFloat(String(round.crashPoint)).toFixed(2)}x
              </button>
            );
          })}
        </div>
      </div>

      {verifyId && (
        <VerifyRoundDialog roundId={verifyId} open={!!verifyId} onClose={() => setVerifyId(null)} />
      )}
    </>
  );
}
