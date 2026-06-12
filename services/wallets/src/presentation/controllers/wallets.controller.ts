import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '@/infrastructure/auth/authenticated-request';
import { CreateWalletUseCase } from '@/application/use-cases/create-wallet.use-case';
import { GetMyWalletUseCase } from '@/application/use-cases/get-my-wallet.use-case';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { WalletResponseDto } from '../dtos/wallet.response.dto';

@ApiTags('wallets')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(
    private readonly createWallet: CreateWalletUseCase,
    private readonly getMyWallet: GetMyWalletUseCase,
  ) {}

  @Post()
  @ApiResponse({ status: 201, type: WalletResponseDto })
  create(@Req() req: AuthenticatedRequest): Promise<WalletResponseDto> {
    return this.createWallet.execute({ playerId: req.user.playerId });
  }

  @Get('me')
  @ApiResponse({ status: 200, type: WalletResponseDto })
  me(@Req() req: AuthenticatedRequest): Promise<WalletResponseDto> {
    return this.getMyWallet.execute({ playerId: req.user.playerId });
  }
}
