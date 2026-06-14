'use client';

import { BetPanel } from '@/components/bet-panel';
import { CrashChart } from '@/components/crash-chart';
import { CurrentBetsList } from '@/components/current-bets-list';
import { PlayerSummary } from '@/components/player-summary';
import { RoundHistory } from '@/components/round-history';
import { useGameSocket } from './use-game-socket';

export function GamePage() {
  useGameSocket();

  return (
    <div className="flex min-h-dvh flex-col bg-[#0F0F23]">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <h1
            className="text-xl font-black tracking-widest text-white shrink-0"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 15px rgba(34,197,94,0.4)',
            }}
          >
            <span className="text-[#22C55E]">CRASH</span>
          </h1>
          <div className="flex-1 max-w-sm">
            <PlayerSummary />
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left column: chart + history */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          {/* Chart */}
          <div className="h-64 sm:h-80 lg:h-96">
            <CrashChart />
          </div>

          {/* Round history */}
          <RoundHistory />
        </div>

        {/* Right column: bet panel + bets list */}
        <div className="flex flex-col gap-4 w-full lg:w-80 shrink-0">
          <BetPanel />
          <CurrentBetsList />
        </div>
      </main>
    </div>
  );
}
