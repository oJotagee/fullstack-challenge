import { describe, expect, it, mock } from 'bun:test';

import { validate } from 'class-validator';

import type { GetCurrentRoundUseCase } from '../../src/application/use-cases/get-current-round.use-case';
import type { GetRoundHistoryUseCase } from '../../src/application/use-cases/get-round-history.use-case';
import type { AuthenticatedRequest } from '../../src/infrastructure/auth/authenticated-request';
import type { VerifyRoundUseCase } from '../../src/application/use-cases/verify-round.use-case';
import type { GetMyBetsUseCase } from '../../src/application/use-cases/get-my-bets.use-case';
import type { PlaceBetUseCase } from '../../src/application/use-cases/place-bet.use-case';
import type { CashOutUseCase } from '../../src/application/use-cases/cash-out.use-case';
import { GamesController } from '../../src/presentation/controllers/games.controller';
import { PlaceBetRequestDto } from '../../src/presentation/dtos/place-bet.request';
import { CashOutRequestDto } from '../../src/presentation/dtos/cash-out.request';

describe('GamesController', () => {
  it('public endpoints call use cases without authenticated request', async () => {
    const controller = createController();

    await controller.current();
    await controller.history();
    await controller.verify('round-1');

    expect(controllerDeps.getCurrentRound.execute).toHaveBeenCalled();
    expect(controllerDeps.getRoundHistory.execute).toHaveBeenCalled();
    expect(controllerDeps.verifyRound.execute).toHaveBeenCalledWith({ roundId: 'round-1' });
  });

  it('GET /games/bets/me uses authenticated player id', async () => {
    const controller = createController();

    await controller.myBets(createRequest('player-1'));

    expect(controllerDeps.getMyBets.execute).toHaveBeenCalledWith({ playerId: 'player-1' });
  });

  it('POST /games/bet converts decimal amount to cents without float', async () => {
    const controller = createController();

    await controller.bet(createRequest('player-1'), { amount: '10.50' });

    expect(controllerDeps.placeBet.execute).toHaveBeenCalledWith({
      playerId: 'player-1',
      username: 'player-1',
      amountCents: '1050',
    });
  });

  it('POST /games/bet/cashout forwards authenticated player and multiplier', async () => {
    const controller = createController();

    await controller.cashout(createRequest('player-1'), { multiplier: 2.5 });

    expect(controllerDeps.cashOut.execute).toHaveBeenCalledWith({
      playerId: 'player-1',
      multiplier: 2.5,
    });
  });

  it('rejects invalid DTO payloads', async () => {
    const placeBet = new PlaceBetRequestDto();
    placeBet.amount = '10.999';
    const cashOut = new CashOutRequestDto();
    cashOut.multiplier = 0.99;

    expect(await validate(placeBet)).toHaveLength(1);
    expect(await validate(cashOut)).toHaveLength(1);
  });
});

let controllerDeps: ReturnType<typeof createDeps>;

function createController(): GamesController {
  controllerDeps = createDeps();

  return new GamesController(
    controllerDeps.getCurrentRound as unknown as GetCurrentRoundUseCase,
    controllerDeps.getRoundHistory as unknown as GetRoundHistoryUseCase,
    controllerDeps.verifyRound as unknown as VerifyRoundUseCase,
    controllerDeps.getMyBets as unknown as GetMyBetsUseCase,
    controllerDeps.placeBet as unknown as PlaceBetUseCase,
    controllerDeps.cashOut as unknown as CashOutUseCase,
  );
}

function createDeps() {
  return {
    getCurrentRound: { execute: mock(async () => ({ id: 'round-1' })) },
    getRoundHistory: { execute: mock(async () => ({ rounds: [] })) },
    verifyRound: { execute: mock(async () => ({ roundId: 'round-1' })) },
    getMyBets: { execute: mock(async () => ({ bets: [] })) },
    placeBet: { execute: mock(async () => ({ betId: 'bet-1' })) },
    cashOut: { execute: mock(async () => ({ betId: 'bet-1' })) },
  };
}

function createRequest(playerId: string): AuthenticatedRequest {
  return {
    user: {
      playerId,
      username: playerId,
      roles: ['player'],
    },
  };
}
