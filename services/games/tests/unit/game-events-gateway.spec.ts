import { describe, expect, it, mock } from 'bun:test';

import { GameEventsGateway } from '../../src/infrastructure/websocket/game-events.gateway';

describe('GameEventsGateway', () => {
  it('emits server-to-client game events to every connected socket', () => {
    const gateway = new GameEventsGateway();
    const server = {
      emit: mock(() => true),
    };

    Reflect.set(gateway, 'server', server);

    gateway.emitRoundBettingStarted({
      roundId: 'round-1',
      bettingEndsAt: '2026-01-01T00:00:10.000Z',
      serverSeedHash: 'hash-1',
    });
    gateway.emitRoundRunningStarted({
      roundId: 'round-1',
      startedAt: '2026-01-01T00:00:11.000Z',
    });
    gateway.emitMultiplierTick({
      roundId: 'round-1',
      multiplier: 1.25,
      elapsedMs: 2500,
    });
    gateway.emitBetAccepted({
      roundId: 'round-1',
      betId: 'bet-1',
      playerId: 'player-1',
      username: 'player',
      amountCents: '1000',
    });
    gateway.emitBetCashedOut({
      roundId: 'round-1',
      betId: 'bet-1',
      playerId: 'player-1',
      username: 'player',
      multiplier: 2.5,
      payoutCents: '2500',
    });
    gateway.emitRoundCrashed({
      roundId: 'round-1',
      crashPoint: 3,
      crashedAt: '2026-01-01T00:00:20.000Z',
      serverSeed: 'server-seed-1',
      serverSeedHash: 'hash-1',
      clientSeed: 'client-seed-1',
      nonce: 1,
    });

    expect(server.emit).toHaveBeenCalledWith('round.betting.started', {
      roundId: 'round-1',
      bettingEndsAt: '2026-01-01T00:00:10.000Z',
      serverSeedHash: 'hash-1',
    });
    expect(server.emit).toHaveBeenCalledWith('round.running.started', {
      roundId: 'round-1',
      startedAt: '2026-01-01T00:00:11.000Z',
    });
    expect(server.emit).toHaveBeenCalledWith('round.multiplier.tick', {
      roundId: 'round-1',
      multiplier: 1.25,
      elapsedMs: 2500,
    });
    expect(server.emit).toHaveBeenCalledWith('bet.accepted', {
      roundId: 'round-1',
      betId: 'bet-1',
      playerId: 'player-1',
      username: 'player',
      amountCents: '1000',
    });
    expect(server.emit).toHaveBeenCalledWith('bet.cashed_out', {
      roundId: 'round-1',
      betId: 'bet-1',
      playerId: 'player-1',
      username: 'player',
      multiplier: 2.5,
      payoutCents: '2500',
    });
    expect(server.emit).toHaveBeenCalledWith('round.crashed', {
      roundId: 'round-1',
      crashPoint: 3,
      crashedAt: '2026-01-01T00:00:20.000Z',
      serverSeed: 'server-seed-1',
      serverSeedHash: 'hash-1',
      clientSeed: 'client-seed-1',
      nonce: 1,
    });
  });

  it('does not expose betting or cashout commands through websocket methods', () => {
    const methodNames = Object.getOwnPropertyNames(GameEventsGateway.prototype);

    expect(methodNames).not.toContain('placeBet');
    expect(methodNames).not.toContain('cashOut');
    expect(methodNames).not.toContain('bet');
    expect(methodNames).not.toContain('cashout');
  });
});
