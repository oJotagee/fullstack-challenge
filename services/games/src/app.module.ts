import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { PrismaRoundRepository } from './infrastructure/persistence/prisma-round.repository';
import { GetRoundHistoryUseCase } from './application/use-cases/get-round-history.use-case';
import { GetCurrentRoundUseCase } from './application/use-cases/get-current-round.use-case';
import { PrismaBetRepository } from './infrastructure/persistence/prisma-bet.repository';
import { VerifyRoundUseCase } from './application/use-cases/verify-round.use-case';
import { CreateRoundUseCase } from './application/use-cases/create-round.use-case';
import { GameExceptionFilter } from './presentation/filters/game-exception.filter';
import { GetMyBetsUseCase } from './application/use-cases/get-my-bets.use-case';
import { HealthController } from './presentation/controllers/health.controller';
import { GamesController } from './presentation/controllers/games.controller';
import { PlaceBetUseCase } from './application/use-cases/place-bet.use-case';
import { ROUND_REPOSITORY } from './application/ports/round-repository.port';
import { CashOutUseCase } from './application/use-cases/cash-out.use-case';
import { BET_REPOSITORY } from './application/ports/bet-repository.port';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { EVENT_BUS } from './application/ports/event-bus.port';
import { CLOCK } from './application/ports/clock.port';

@Module({
  controllers: [HealthController, GamesController],
  providers: [
    PrismaService,
    CreateRoundUseCase,
    GetCurrentRoundUseCase,
    GetMyBetsUseCase,
    PlaceBetUseCase,
    CashOutUseCase,
    GetRoundHistoryUseCase,
    VerifyRoundUseCase,
    {
      provide: APP_FILTER,
      useClass: GameExceptionFilter,
    },
    {
      provide: ROUND_REPOSITORY,
      useClass: PrismaRoundRepository,
    },
    {
      provide: BET_REPOSITORY,
      useClass: PrismaBetRepository,
    },
    {
      provide: CLOCK,
      useValue: {
        now: () => new Date(),
      },
    },
    {
      provide: EVENT_BUS,
      useValue: {
        publish: async () => undefined,
      },
    },
  ],
})
export class AppModule {}
