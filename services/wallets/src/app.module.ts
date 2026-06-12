import { Module } from '@nestjs/common';

import { PrismaWalletRepository } from './infrastructure/persistence/prisma-wallet.repository';
import { CreateWalletUseCase } from './application/use-cases/create-wallet.use-case';
import { CreditWalletUseCase } from './application/use-cases/credit-wallet.use-case';
import { GetMyWalletUseCase } from './application/use-cases/get-my-wallet.use-case';
import { DebitWalletUseCase } from './application/use-cases/debit-wallet.use-case';
import { WalletsController } from './presentation/controllers/wallets.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { WALLET_REPOSITORY } from './application/ports/wallet-repository.port';
import { PrismaService } from './infrastructure/prisma/prisma.service';

@Module({
  controllers: [HealthController, WalletsController],
  providers: [
    PrismaService,
    CreateWalletUseCase,
    GetMyWalletUseCase,
    DebitWalletUseCase,
    CreditWalletUseCase,
    {
      // Liga a porta da aplicacao ao adapter Prisma da infraestrutura.
      provide: WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
  ],
})
export class AppModule {}
