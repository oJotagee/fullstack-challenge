import { Module } from '@nestjs/common';

import { WalletCommandEventsHandler } from './application/handlers/wallet-command-events.handler';
import { PrismaWalletRepository } from './infrastructure/persistence/prisma-wallet.repository';
import { WalletCommandConsumer } from './infrastructure/messaging/wallet-command.consumer';
import { CreateWalletUseCase } from './application/use-cases/create-wallet.use-case';
import { CreditWalletUseCase } from './application/use-cases/credit-wallet.use-case';
import { GetMyWalletUseCase } from './application/use-cases/get-my-wallet.use-case';
import { DebitWalletUseCase } from './application/use-cases/debit-wallet.use-case';
import { WalletsController } from './presentation/controllers/wallets.controller';
import { RabbitMqEventBus } from './infrastructure/messaging/rabbitmq-event-bus';
import { HealthController } from './presentation/controllers/health.controller';
import { WALLET_REPOSITORY } from './application/ports/wallet-repository.port';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { EVENT_BUS } from './application/ports/event-bus.port';

@Module({
  controllers: [HealthController, WalletsController],
  providers: [
    PrismaService,
    CreateWalletUseCase,
    GetMyWalletUseCase,
    DebitWalletUseCase,
    CreditWalletUseCase,
    WalletCommandEventsHandler,
    WalletCommandConsumer,
    {
      provide: EVENT_BUS,
      useClass: RabbitMqEventBus,
    },
    {
      // Liga a porta da aplicacao ao adapter Prisma da infraestrutura.
      provide: WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
  ],
})
export class AppModule {}
