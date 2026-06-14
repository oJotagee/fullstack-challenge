import { io, type Socket } from 'socket.io-client';

import { playCrashSound } from '@/lib/audio-feedback';

import type { Bet } from './game-api';
import { useGameStore } from './game-store';

interface BettingStartedPayload {
  roundId: string;
  serverSeedHash: string;
  bettingEndsAt: string;
}

interface RunningStartedPayload {
  roundId: string;
  startedAt: string;
}

interface MultiplierTickPayload {
  roundId: string;
  multiplier: number;
  elapsedMs: number;
}

interface BetAcceptedPayload {
  roundId: string;
  betId: string;
  playerId: string;
  username: string;
  amountCents: string;
}

interface BetCashedOutPayload {
  roundId: string;
  betId: string;
  playerId: string;
  username: string;
  multiplier: number;
  payoutCents: string;
}

interface RoundCrashedPayload {
  roundId: string;
  crashPoint: number;
  crashedAt: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_WS_URL ?? '';

  socket = io(url, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

export function connectGameSocket(myPlayerId: string | null): () => void {
  const s = getSocket();

  const onBettingStarted = (payload: BettingStartedPayload) => {
    // Reset para nova rodada — apostas e myBet da rodada anterior são descartados
    useGameStore.getState().setCurrentRound(
      {
        id: payload.roundId,
        status: 'BETTING',
        serverSeedHash: payload.serverSeedHash,
        bettingEndsAt: payload.bettingEndsAt,
        bets: [],
      },
      myPlayerId,
    );
  };

  const onRunningStarted = (_payload: RunningStartedPayload) => {
    useGameStore.getState().setPhase('RUNNING');
  };

  const onMultiplierTick = (payload: MultiplierTickPayload) => {
    useGameStore.getState().setMultiplier(payload.multiplier);
  };

  const onBetAccepted = (payload: BetAcceptedPayload) => {
    const bet: Bet = {
      id: payload.betId,
      roundId: payload.roundId,
      playerId: payload.playerId,
      username: payload.username,
      amountCents: payload.amountCents,
      status: 'ACCEPTED',
      createdAt: new Date().toISOString(),
    };
    useGameStore.getState().addOrUpdateBet(bet, myPlayerId);
  };

  const onBetCashedOut = (payload: BetCashedOutPayload) => {
    const store = useGameStore.getState();
    const existing = store.bets.find((b) => b.id === payload.betId);
    const bet: Bet = {
      id: payload.betId,
      roundId: payload.roundId,
      playerId: payload.playerId,
      username: payload.username,
      amountCents: existing?.amountCents ?? '0',
      status: 'CASHED_OUT',
      cashoutMultiplier: String(payload.multiplier),
      payoutCents: payload.payoutCents,
      cashedOutAt: new Date().toISOString(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    store.addOrUpdateBet(bet, myPlayerId);
  };

  const onRoundCrashed = (payload: RoundCrashedPayload) => {
    const store = useGameStore.getState();
    playCrashSound();
    store.handleCrash(String(payload.crashPoint), payload.serverSeed);
    store.addToHistory({
      id: payload.roundId,
      crashPoint: payload.crashPoint,
      crashedAt: payload.crashedAt,
    });
  };

  s.on('round.betting.started', onBettingStarted);
  s.on('round.running.started', onRunningStarted);
  s.on('round.multiplier.tick', onMultiplierTick);
  s.on('bet.accepted', onBetAccepted);
  s.on('bet.cashed_out', onBetCashedOut);
  s.on('round.crashed', onRoundCrashed);

  return () => {
    s.off('round.betting.started', onBettingStarted);
    s.off('round.running.started', onRunningStarted);
    s.off('round.multiplier.tick', onMultiplierTick);
    s.off('bet.accepted', onBetAccepted);
    s.off('bet.cashed_out', onBetCashedOut);
    s.off('round.crashed', onRoundCrashed);
  };
}

export function disconnectGameSocket(): void {
  socket?.disconnect();
  socket = null;
}
