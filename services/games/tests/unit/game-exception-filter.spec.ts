import { describe, expect, it, mock } from 'bun:test';

import type { ArgumentsHost } from '@nestjs/common';

import { CurrentRoundNotFoundError, RoundNotRunningError } from '../../src/application/use-cases/game-use-case.errors';
import { GameExceptionFilter } from '../../src/presentation/filters/game-exception.filter';

describe('GameExceptionFilter', () => {
  it('maps missing current round to 404', () => {
    const { host, response } = createHost('/rounds/current');

    new GameExceptionFilter().catch(new CurrentRoundNotFoundError(), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Current round was not found.',
      error: 'NotFound',
      path: '/rounds/current',
    });
  });

  it('maps invalid game state to 409', () => {
    const { host, response } = createHost('/bet/cashout');

    new GameExceptionFilter().catch(new RoundNotRunningError(), host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Round is not running.',
      error: 'Conflict',
      path: '/bet/cashout',
    });
  });
});

function createHost(url: string) {
  const response = {
    status: mock(function status() {
      // Permite encadear response.status(...).json(...), igual ao Express.
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
