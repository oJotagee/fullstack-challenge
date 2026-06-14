'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/auth-store';
import { walletKeys } from '@/features/wallet/wallet-query';

import { getCurrentRound, getRoundHistory } from './game-api';
import { connectGameSocket, disconnectGameSocket } from './game-socket';
import { useGameStore } from './game-store';

export function useGameSocket() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const playerId = useAuthStore((s) => s.playerId);
  const setCurrentRound = useGameStore((s) => s.setCurrentRound);
  const setHistory = useGameStore((s) => s.setHistory);
  const resetRound = useGameStore((s) => s.resetRound);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (!isAuthenticated) {
      resetRound();
      return;
    }

    getCurrentRound()
      .then((round) => setCurrentRound(round, playerId))
      .catch(() => {
        resetRound();
      });

    getRoundHistory(1, 20)
      .then((data) => setHistory(Array.isArray(data.rounds) ? data.rounds : []))
      .catch(() => {});
  }, [isAuthenticated, playerId, resetRound, setCurrentRound, setHistory]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (phase === 'CRASHED' || phase === 'IDLE') {
      void queryClient.invalidateQueries({ queryKey: walletKeys.me() });
    }
  }, [isAuthenticated, phase, queryClient]);

  // Connect socket
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectGameSocket();
      return;
    }

    const cleanup = connectGameSocket(playerId);
    return () => {
      cleanup();
      disconnectGameSocket();
    };
  }, [isAuthenticated, playerId]);
}
