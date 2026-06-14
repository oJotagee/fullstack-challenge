import { expect, test } from '@playwright/test';

import {
  cleanupE2EState,
  createBettingRound,
  createDatabases,
  disconnectDatabases,
  e2ePlayer,
  findBetById,
  getPlayerAccessToken,
  postAuthorized,
  resetE2EState,
  waitForBetStatus,
  waitForWalletBalance,
  type E2EDatabases,
} from './e2e-helpers';

test.describe('Validation E2E', () => {
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

  test('saldo insuficiente rejeita aposta', async ({ request }) => {
    const roundId = 'e2e-insufficient-funds-round';

    // Carteira com saldo menor que a aposta deve gerar debit.failed e bet REJECTED.
    await resetE2EState(databases, { walletBalanceCents: 500n });
    await createBettingRound(databases, { id: roundId });

    const response = await postAuthorized(request, '/games/bet', accessToken, {
      amount: '10.00',
    });
    expect(response.status()).toBe(201);

    const body = (await response.json()) as { betId: string; status: string };
    expect(body.status).toBe('PENDING_DEBIT');

    await waitForBetStatus(databases, { betId: body.betId, status: 'REJECTED' });
    await waitForWalletBalance(databases, 500n);

    const bet = await findBetById(databases, body.betId);
    expect(bet?.rejected_reason).toBe('INSUFFICIENT_FUNDS');
  });

  test('aposta duplicada é bloqueada na mesma rodada', async ({ request }) => {
    // A segunda aposta do mesmo jogador na mesma rodada deve ser rejeitada pelo Game.
    await createBettingRound(databases, { id: 'e2e-duplicated-bet-round' });

    const firstResponse = await postAuthorized(request, '/games/bet', accessToken, {
      amount: '10.00',
    });
    expect(firstResponse.status()).toBe(201);

    const secondResponse = await postAuthorized(request, '/games/bet', accessToken, {
      amount: '10.00',
    });
    expect(secondResponse.status()).toBe(409);

    const body = (await secondResponse.json()) as { message: string };
    expect(body.message).toContain(e2ePlayer.id);
  });

  test('payload inválido é rejeitado', async ({ request }) => {
    // Valor com tres casas decimais nao pode entrar na regra monetaria.
    await createBettingRound(databases, { id: 'e2e-invalid-payload-round' });

    const response = await postAuthorized(request, '/games/bet', accessToken, {
      amount: '10.999',
    });

    expect(response.status()).toBe(400);
  });
});
