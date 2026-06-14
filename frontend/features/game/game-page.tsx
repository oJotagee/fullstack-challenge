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
      <header className="border-b border-white/[0.06] px-3 py-3 sm:px-4">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h1
            className="shrink-0 text-lg font-black tracking-widest text-white sm:text-xl"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 15px rgba(34,197,94,0.4)',
            }}
          >
            <span className="text-[#22C55E]">CRASH</span>
          </h1>
          <div className="w-full sm:max-w-sm sm:flex-1">
            <PlayerSummary />
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:flex-row lg:items-start">
        {/* Left column: chart + history */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
          {/* Chart */}
          <div className="h-[52dvh] min-h-72 max-h-[520px] sm:h-80 lg:h-[28rem]">
            <CrashChart />
          </div>

          {/* Round history */}
          <RoundHistory />
        </div>

        {/* Right column: bet panel + bets list */}
        <div className="flex w-full shrink-0 flex-col gap-3 sm:gap-4 lg:w-80 xl:w-88">
          <BetPanel />
          <CurrentBetsList />
        </div>
      </main>
    </div>
  );
}
