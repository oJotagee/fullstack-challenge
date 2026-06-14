import { expect, test } from '@playwright/test';

import {
  cleanupE2EState,
  createBettingRound,
  createDatabases,
  disconnectDatabases,
  e2ePlayer,
  findBetById,
  findWalletBalance,
  getAuthorized,
  getPlayerAccessToken,
  markAcceptedBetsAsLost,
  markRoundCrashed,
  markRoundRunning,
  postAuthorized,
  resetE2EState,
  waitForBetStatus,
  waitForWalletBalance,
  type E2EDatabases,
} from './e2e-helpers';

test.describe('Gameplay E2E', () => {
  let databases: E2EDatabases;
  let accessToken: string;

  test.beforeAll(async () => {
    databases = createDatabases();
    accessToken = await getPlayerAccessToken();
  });

  test.afterAll(async () => {
    await cleanupE2EState(databases);
    await disconnectDatabases(databases);
  });

  test.beforeEach(async () => {
    await resetE2EState(databases, { walletBalanceCents: 100_000n });
  });

  test.afterEach(async () => {
    await cleanupE2EState(databases);
  });

  test('apostar -> débito -> cash out -> crédito', async ({ request }) => {
    const roundId = 'e2e-cashout-round';

    // Cria uma rodada de aposta controlada e aposta via API real do Game.
    await createBettingRound(databases, { id: roundId });

    const betResponse = await postAuthorized(request, '/games/bet', accessToken, {
      amount: '10.00',
    });
    expect(betResponse.status()).toBe(201);

    const betBody = (await betResponse.json()) as { betId: string; status: string };
    expect(betBody.status).toBe('PENDING_DEBIT');

    await waitForBetStatus(databases, { betId: betBody.betId, status: 'ACCEPTED' });
    await waitForWalletBalance(databases, 99_000n);

    // Depois do debito confirmado, a rodada entra em RUNNING e o servidor calcula o multiplicador.
    await markRoundRunning(databases, {
      roundId,
      crashPoint: '5.0000',
      startedMsAgo: 15_000,
    });

    const cashoutResponse = await postAuthorized(request, '/games/bet/cashout', accessToken);
    expect(cashoutResponse.status()).toBe(201);

    const cashoutBody = (await cashoutResponse.json()) as {
      betId: string;
      status: string;
      payoutCents: string;
      multiplier: number;
    };
    const payoutCents = BigInt(cashoutBody.payoutCents);

    // O cash out publica credito no Wallet, entao o saldo final precisa refletir debito + payout.
    expect(cashoutBody.betId).toBe(betBody.betId);
    expect(cashoutBody.status).toBe('CASHED_OUT');
    expect(cashoutBody.multiplier).toBeGreaterThanOrEqual(2.5);
    expect(payoutCents).toBeGreaterThan(1_000n);

    await waitForBetStatus(databases, { betId: betBody.betId, status: 'CASHED_OUT' });
    await waitForWalletBalance(databases, 99_000n + payoutCents);

    const walletResponse = await getAuthorized(request, '/wallets/me', accessToken);
    expect(walletResponse.status()).toBe(200);

    const walletBody = (await walletResponse.json()) as {
      id: string;
      playerId: string;
      balanceCents: string;
    };
    expect(walletBody).toEqual({
      id: 'wallet-player-seed',
      playerId: e2ePlayer.id,
      balanceCents: (99_000n + payoutCents).toString(),
    });
  });

  test('apostar -> crash -> bet perdida', async ({ request }) => {
    const roundId = 'e2e-lost-round';

    // Aposta aceita sem cash out deve perder quando a rodada crasha.
    await createBettingRound(databases, { id: roundId });

    const betResponse = await postAuthorized(request, '/games/bet', accessToken, {
      amount: '10.00',
    });
    expect(betResponse.status()).toBe(201);

    const betBody = (await betResponse.json()) as { betId: string };

    await waitForBetStatus(databases, { betId: betBody.betId, status: 'ACCEPTED' });
    await waitForWalletBalance(databases, 99_000n);

    await markRoundCrashed(databases, { roundId, crashPoint: '1.5000' });
    await markAcceptedBetsAsLost(databases, { roundId });

    const bet = await findBetById(databases, betBody.betId);
    const balance = await findWalletBalance(databases);

    expect(bet?.status).toBe('LOST');
    expect(balance).toBe(99_000n);

    const myBetsResponse = await getAuthorized(request, '/games/bets/me', accessToken);
    expect(myBetsResponse.status()).toBe(200);

    const myBets = (await myBetsResponse.json()) as {
      bets: Array<{ id: string; status: string }>;
    };
    expect(myBets.bets).toContainEqual(
      expect.objectContaining({ id: betBody.betId, status: 'LOST' }),
    );
  });
});
