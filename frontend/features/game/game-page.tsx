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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Left column: chart + history */}
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          {/* Chart */}
          <div className="order-1 h-[52dvh] min-h-72 max-h-[520px] sm:h-80 lg:order-none lg:h-[28rem]">
            <CrashChart />
          </div>

          {/* Round history */}
          <div className="order-4 lg:order-none">
            <RoundHistory />
          </div>
        </div>

        {/* Right column: bet panel + bets list */}
        <div className="order-2 flex w-full shrink-0 flex-col gap-3 sm:gap-4 lg:order-none lg:w-auto">
          <BetPanel />
          <CurrentBetsList />
        </div>
      </main>
    </div>
  );
}
