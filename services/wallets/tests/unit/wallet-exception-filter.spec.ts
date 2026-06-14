import { describe, expect, it, mock } from 'bun:test';

import type { ArgumentsHost } from '@nestjs/common';

import { WalletNotFoundError } from '../../src/application/use-cases/wallet-use-case.errors';
import { WalletExceptionFilter } from '../../src/presentation/filters/wallet-exception.filter';

describe('WalletExceptionFilter', () => {
  it('maps missing wallet to 404', () => {
    const { host, response } = createHost('/wallets/me');

    new WalletExceptionFilter().catch(new WalletNotFoundError('player'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Wallet for player player was not found.',
      error: 'NotFound',
      path: '/wallets/me',
    });
  });
});

function createHost(url: string) {
  const response = {
    status: mock(function status() {
      return response;
    }),
    json: mock(() => undefined),
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}
