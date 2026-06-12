import { describe, expect, it, mock } from 'bun:test';

import type { CreateWalletUseCase } from '../../src/application/use-cases/create-wallet.use-case';
import type { GetMyWalletUseCase } from '../../src/application/use-cases/get-my-wallet.use-case';
import type { AuthenticatedRequest } from '../../src/infrastructure/auth/authenticated-request';
import { WalletsController } from '../../src/presentation/controllers/wallets.controller';

describe('WalletsController', () => {
  it('POST /wallets creates a wallet for the authenticated player', async () => {
    const createWallet = {
      execute: mock(async (input: { playerId: string }) => ({
        id: 'wallet-1',
        playerId: input.playerId,
        balanceCents: '0',
      })),
    };
    const getMyWallet = {
      execute: mock(),
    };
    const controller = new WalletsController(
      createWallet as unknown as CreateWalletUseCase,
      getMyWallet as unknown as GetMyWalletUseCase,
    );
    const request = createAuthenticatedRequest('player-1');

    const response = await controller.create(request);

    expect(createWallet.execute).toHaveBeenCalledWith({ playerId: 'player-1' });
    expect(response).toEqual({
      id: 'wallet-1',
      playerId: 'player-1',
      balanceCents: '0',
    });
  });

  it('GET /wallets/me returns balanceCents as string', async () => {
    const createWallet = {
      execute: mock(),
    };
    const getMyWallet = {
      execute: mock(async (input: { playerId: string }) => ({
        id: 'wallet-1',
        playerId: input.playerId,
        balanceCents: '1050',
      })),
    };
    const controller = new WalletsController(
      createWallet as unknown as CreateWalletUseCase,
      getMyWallet as unknown as GetMyWalletUseCase,
    );
    const request = createAuthenticatedRequest('player-1');

    const response = await controller.me(request);

    expect(getMyWallet.execute).toHaveBeenCalledWith({ playerId: 'player-1' });
    expect(response.balanceCents).toBe('1050');
    expect(typeof response.balanceCents).toBe('string');
  });
});

function createAuthenticatedRequest(playerId: string): AuthenticatedRequest {
  return {
    user: {
      playerId,
      username: playerId,
      roles: ['player'],
    },
  };
}
