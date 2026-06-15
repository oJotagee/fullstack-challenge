import { create } from 'zustand';

import type { Bet, BetStatus, Round, RoundPhase, RoundSummary } from './game-api';

const MAX_HISTORY = 20;

interface GameState {
  phase: RoundPhase | 'IDLE';
  currentRound: Round | null;
  multiplier: number;
  bets: Bet[];
  myBet: Bet | null;
  pendingBet: boolean;
  roundHistory: RoundSummary[];

  setCurrentRound: (round: Round, myPlayerId: string | null) => void;
  setPendingBet: (pending: boolean) => void;
  addToHistory: (summary: RoundSummary) => void;
  setHistory: (history: RoundSummary[]) => void;

  setPhase: (phase: RoundPhase | 'IDLE') => void;
  setMultiplier: (multiplier: number) => void;
  addOrUpdateBet: (bet: Bet, myPlayerId: string | null) => void;
  updateBetStatus: (betId: string, status: BetStatus, extra?: Partial<Bet>) => void;
  handleCrash: (crashPoint: string, serverSeed: string) => void;
  resetRound: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'IDLE',
  currentRound: null,
  multiplier: 1,
  bets: [],
  myBet: null,
  pendingBet: false,
  roundHistory: [],

  setCurrentRound(round, myPlayerId) {
    const bets = Array.isArray(round.bets) ? round.bets : [];
    const myBet = myPlayerId ? (bets.find((bet) => bet.playerId === myPlayerId) ?? null) : null;
    set({
      currentRound: { ...round, bets },
      phase: round.status,
      bets,
      myBet,
      multiplier: 1,
      pendingBet: false,
    });
  },

  setPendingBet(pending) {
    set({ pendingBet: pending });
  },

  addToHistory(summary) {
    if (!summary || summary.crashPoint == null) {
      return;
    }

    const normalized = { ...summary, crashPoint: String(summary.crashPoint) };
    set((s) => ({
      roundHistory: [normalized, ...s.roundHistory].slice(0, MAX_HISTORY),
    }));
  },

  setHistory(history) {
    const normalized = history
      .filter((round): round is RoundSummary => Boolean(round && round.crashPoint != null))
      .map((round) => ({ ...round, crashPoint: String(round.crashPoint) }));
    set({ roundHistory: normalized.slice(0, MAX_HISTORY) });
  },

  setPhase(phase) {
    set({ phase });
    if (phase === 'BETTING') {
      set({ multiplier: 1 });
    }
  },

  setMultiplier(multiplier) {
    set({ multiplier });
  },

  addOrUpdateBet(bet, myPlayerId) {
    set((s) => {
      const exists = s.bets.some((b) => b.id === bet.id);
      const bets = exists
        ? s.bets.map((b) => (b.id === bet.id ? { ...b, ...bet } : b))
        : [...s.bets, bet];
      const isMyBet = myPlayerId === bet.playerId;
      const myBet = isMyBet ? bet : s.myBet;
      return { bets, myBet, ...(isMyBet ? { pendingBet: false } : {}) };
    });
  },

  updateBetStatus(betId, status, extra = {}) {
    set((s) => {
      const bets = s.bets.map((b) => (b.id === betId ? { ...b, status, ...extra } : b));
      const myBet = s.myBet?.id === betId ? { ...s.myBet, status, ...extra } : s.myBet;
      return { bets, myBet };
    });
  },

  handleCrash(crashPoint, serverSeed) {
    set((s) => {
      const currentRound = s.currentRound
        ? { ...s.currentRound, crashPoint, serverSeed, status: 'CRASHED' as RoundPhase }
        : null;

      const lostBets = s.bets.map((b) =>
        b.status === 'ACCEPTED' ? { ...b, status: 'LOST' as BetStatus } : b,
      );
      const myBet =
        s.myBet?.status === 'ACCEPTED' ? { ...s.myBet, status: 'LOST' as BetStatus } : s.myBet;

      return { phase: 'CRASHED', currentRound, bets: lostBets, myBet };
    });
  },

  resetRound() {
    set({
      currentRound: null,
      phase: 'IDLE',
      multiplier: 1,
      bets: [],
      myBet: null,
      pendingBet: false,
    });
  },
}));
