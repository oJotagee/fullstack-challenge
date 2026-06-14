import { request, type APIRequestContext, expect } from '@playwright/test';
import { Pool } from 'pg';

const playerId = process.env.E2E_PLAYER_ID ?? 'player';
const playerPassword = process.env.E2E_PLAYER_PASSWORD ?? 'player123';
const keycloakUrl = process.env.E2E_KEYCLOAK_URL ?? 'http://localhost:8080';
const keycloakRealm = process.env.E2E_KEYCLOAK_REALM ?? 'crash-game';
const keycloakClientId = process.env.E2E_KEYCLOAK_CLIENT_ID ?? 'crash-game-client';
const gamesDatabaseUrl =
  process.env.E2E_GAMES_DATABASE_URL ?? 'postgresql://admin:admin@localhost:5432/games';
const walletsDatabaseUrl =
  process.env.E2E_WALLETS_DATABASE_URL ?? 'postgresql://admin:admin@localhost:5432/wallets';

export const e2ePlayer = {
  id: playerId,
  username: playerId,
};

export type E2EDatabases = {
  games: Pool;
  wallets: Pool;
};

export function createDatabases(): E2EDatabases {
  // Playwright roda fora dos containers, entao usa as portas publicadas no host.
  return {
    games: new Pool({ connectionString: gamesDatabaseUrl }),
    wallets: new Pool({ connectionString: walletsDatabaseUrl }),
  };
}

export async function disconnectDatabases(databases: E2EDatabases): Promise<void> {
  await Promise.all([databases.games.end(), databases.wallets.end()]);
}

export async function getPlayerAccessToken(): Promise<string> {
  // Usa o fluxo password grant apenas para teste E2E com o usuario seedado no Keycloak.
  const keycloakRequest = await request.newContext({ baseURL: keycloakUrl });

  try {
    const response = await keycloakRequest.post(
      `/realms/${keycloakRealm}/protocol/openid-connect/token`,
      {
        form: {
          grant_type: 'password',
          client_id: keycloakClientId,
          username: playerId,
          password: playerPassword,
        },
      },
    );

    expect(response.ok()).toBe(true);

    const body = (await response.json()) as { access_token?: string };
    expect(body.access_token).toBeTruthy();

    return body.access_token!;
  } finally {
    await keycloakRequest.dispose();
  }
}

export async function resetE2EState(
  databases: E2EDatabases,
  input: { walletBalanceCents: bigint },
): Promise<void> {
  // Cada teste começa com rodada e carteira controladas para nao depender da engine em tempo real.
  await cleanupE2EState(databases, input);
}

export async function cleanupE2EState(
  databases: E2EDatabases,
  input: { walletBalanceCents: bigint } = { walletBalanceCents: 100_000n },
): Promise<void> {
  // Remove rodadas artificiais para nao deixar o jogo preso em uma rodada expirada de teste.
  await databases.games.query('delete from bets where round_id like $1', ['e2e-%']);
  await databases.games.query('delete from rounds where id like $1', ['e2e-%']);

  const wallet = await databases.wallets.query<{ id: string }>(
    'select id from wallets where player_id = $1',
    [playerId],
  );

  if (wallet.rows[0]) {
    await databases.wallets.query('delete from ledger_entries where wallet_id = $1', [
      wallet.rows[0].id,
    ]);
    await databases.wallets.query('delete from wallets where id = $1', [wallet.rows[0].id]);
  }

  await databases.wallets.query(
    'insert into wallets (id, player_id, balance_cents, created_at, updated_at) values ($1, $2, $3, now(), now())',
    ['wallet-player-seed', playerId, input.walletBalanceCents.toString()],
  );
}

export async function createBettingRound(
  databases: E2EDatabases,
  input: { id: string; bettingWindowMs?: number },
): Promise<void> {
  const currentRoundOrderingDate = new Date('2099-01-01T00:00:00.000Z');
  const bettingWindowMs = input.bettingWindowMs ?? 60_000;

  // A created_at bem futura faz esta rodada ser escolhida pelo findCurrent mesmo com a engine ativa.
  await databases.games.query(
    `insert into rounds (
      id,
      status,
      server_seed_hash,
      server_seed,
      previous_server_seed_hash,
      hash_chain_index,
      betting_started_at,
      betting_ends_at,
      created_at,
      updated_at
    ) values (
      $1,
      'BETTING',
      $2,
      $3,
      null,
      $4,
      now() - interval '1 second',
      now() + ($5 * interval '1 millisecond'),
      $6,
      $6
    )`,
    [
      input.id,
      `hash-${input.id}`,
      `server-seed-${input.id}`,
      100_000,
      bettingWindowMs,
      currentRoundOrderingDate,
    ],
  );
}

export async function markRoundRunning(
  databases: E2EDatabases,
  input: { roundId: string; crashPoint: string; startedMsAgo: number },
): Promise<void> {
  // Simula a engine colocando a rodada em RUNNING antes do cash out.
  await databases.games.query(
    `update rounds
     set status = 'RUNNING',
         client_seed = $2,
         nonce = 1,
         crash_point = $3,
         running_started_at = now() - ($4 * interval '1 millisecond'),
         updated_at = now()
     where id = $1`,
    [input.roundId, `client-seed-${input.roundId}`, input.crashPoint, input.startedMsAgo],
  );
}

export async function markRoundCrashed(
  databases: E2EDatabases,
  input: { roundId: string; crashPoint: string },
): Promise<void> {
  // Simula o crash para validar a liquidacao de aposta perdida.
  await databases.games.query(
    `update rounds
     set status = 'CRASHED',
         client_seed = $2,
         nonce = 1,
         crash_point = $3,
         crashed_at = now(),
         updated_at = now()
     where id = $1`,
    [input.roundId, `client-seed-${input.roundId}`, input.crashPoint],
  );
}

export async function markAcceptedBetsAsLost(
  databases: E2EDatabases,
  input: { roundId: string },
): Promise<void> {
  await databases.games.query(
    "update bets set status = 'LOST', updated_at = now() where round_id = $1 and status = 'ACCEPTED'",
    [input.roundId],
  );
}

export async function waitForBetStatus(
  databases: E2EDatabases,
  input: { betId: string; status: string },
): Promise<void> {
  await poll(async () => {
    const bet = await databases.games.query<{ status: string }>(
      'select status from bets where id = $1',
      [input.betId],
    );

    return bet.rows[0]?.status === input.status;
  });
}

export async function waitForWalletBalance(
  databases: E2EDatabases,
  expectedBalanceCents: bigint,
): Promise<void> {
  await poll(async () => {
    const wallet = await databases.wallets.query<{ balance_cents: string }>(
      'select balance_cents from wallets where player_id = $1',
      [playerId],
    );

    return wallet.rows[0]?.balance_cents === expectedBalanceCents.toString();
  });
}

export async function findBetById(
  databases: E2EDatabases,
  betId: string,
): Promise<{ status: string; rejected_reason: string | null } | null> {
  const bet = await databases.games.query<{ status: string; rejected_reason: string | null }>(
    'select status, rejected_reason from bets where id = $1',
    [betId],
  );

  return bet.rows[0] ?? null;
}

export async function findWalletBalance(databases: E2EDatabases): Promise<bigint | null> {
  const wallet = await databases.wallets.query<{ balance_cents: string }>(
    'select balance_cents from wallets where player_id = $1',
    [playerId],
  );

  return wallet.rows[0] ? BigInt(wallet.rows[0].balance_cents) : null;
}

export async function postAuthorized(
  api: APIRequestContext,
  path: string,
  accessToken: string,
  data: Record<string, unknown> = {},
) {
  return api.post(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data,
  });
}

export async function getAuthorized(api: APIRequestContext, path: string, accessToken: string) {
  return api.get(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function poll(assertion: () => Promise<boolean>, timeoutMs = 10_000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await assertion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for E2E condition.');
}
