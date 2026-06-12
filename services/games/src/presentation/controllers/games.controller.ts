import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentRoundUseCase } from '@/application/use-cases/get-current-round.use-case';
import { GetRoundHistoryUseCase } from '@/application/use-cases/get-round-history.use-case';
import type { AuthenticatedRequest } from '@/infrastructure/auth/authenticated-request';
import { VerifyRoundUseCase } from '@/application/use-cases/verify-round.use-case';
import { GetMyBetsUseCase } from '@/application/use-cases/get-my-bets.use-case';
import { PlaceBetUseCase } from '@/application/use-cases/place-bet.use-case';
import { CashOutUseCase } from '@/application/use-cases/cash-out.use-case';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { PlaceBetRequestDto } from '../dtos/place-bet.request';
import { CashOutRequestDto } from '../dtos/cash-out.request';

@ApiTags('games')
@Controller()
export class GamesController {
  constructor(
    private readonly getCurrentRound: GetCurrentRoundUseCase,
    private readonly getRoundHistory: GetRoundHistoryUseCase,
    private readonly verifyRound: VerifyRoundUseCase,
    private readonly getMyBets: GetMyBetsUseCase,
    private readonly placeBet: PlaceBetUseCase,
    private readonly cashOut: CashOutUseCase,
  ) {}

  @Get('rounds/current')
  @ApiResponse({ status: 200, description: 'Estado da rodada atual.' })
  current() {
    return this.getCurrentRound.execute();
  }

  @Get('rounds/history')
  @ApiResponse({ status: 200, description: 'Historico de rodadas crashadas.' })
  history(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getRoundHistory.execute({
      page: parseOptionalPositiveInt(page, 'page'),
      limit: parseOptionalPositiveInt(limit, 'limit'),
    });
  }

  @Get('rounds/:roundId/verify')
  @ApiResponse({ status: 200, description: 'Dados para verificacao provably fair.' })
  verify(@Param('roundId') roundId: string) {
    return this.verifyRound.execute({ roundId });
  }

  @Get('bets/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Historico de apostas do jogador autenticado.' })
  myBets(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getMyBets.execute({
      playerId: req.user.playerId,
      page: parseOptionalPositiveInt(page, 'page'),
      limit: parseOptionalPositiveInt(limit, 'limit'),
    });
  }

  @Post('bet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Cria uma aposta pendente de debito.' })
  bet(@Req() req: AuthenticatedRequest, @Body() body: PlaceBetRequestDto) {
    return this.placeBet.execute({
      playerId: req.user.playerId,
      username: req.user.username,
      amountCents: decimalToCents(body.amount),
    });
  }

  @Post('bet/cashout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Realiza cash out da aposta aceita.' })
  cashout(@Req() req: AuthenticatedRequest, @Body() body: CashOutRequestDto) {
    return this.cashOut.execute({
      playerId: req.user.playerId,
      multiplier: body.multiplier,
    });
  }
}

function decimalToCents(amount: string): string {
  // Nunca converte dinheiro para number; mantem precisao em centavos.
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw new Error('Invalid amount format.');
  }

  const [units, decimals = ''] = amount.split('.');

  return (BigInt(units) * 100n + BigInt(decimals.padEnd(2, '0'))).toString();
}

function parseOptionalPositiveInt(value: string | undefined, field: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(value)) {
    throw new BadRequestException(`${field} must be a positive integer.`);
  }

  return Number(value);
}
