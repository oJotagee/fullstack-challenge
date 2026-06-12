import { Injectable } from '@nestjs/common';

import type { BetRepository } from '@/application/ports/bet-repository.port';
import { PrismaService } from '../prisma/prisma.service';
import { Bet } from '@/domain/bet/bet.entity';
import { BetMapper } from './bet.mapper';

@Injectable()
export class PrismaBetRepository implements BetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Bet | null> {
    // Busca direta usada por fluxos administrativos ou testes de persistencia.
    const bet = await this.prisma.bet.findUnique({ where: { id } });

    return bet ? BetMapper.toDomain(bet) : null;
  }

  async findByRoundIdAndPlayerId(roundId: string, playerId: string): Promise<Bet | null> {
    // Protege a regra de uma aposta por jogador em cada rodada.
    const bet = await this.prisma.bet.findUnique({
      where: {
        roundId_playerId: {
          roundId,
          playerId,
        },
      },
    });

    return bet ? BetMapper.toDomain(bet) : null;
  }

  async findByPlayerId(playerId: string): Promise<Bet[]> {
    // Suporta o futuro endpoint /games/bets/me.
    const bets = await this.prisma.bet.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });

    return bets.map((bet) => BetMapper.toDomain(bet));
  }

  async save(bet: Bet): Promise<void> {
    const persistence = BetMapper.toPersistence(bet);

    // Upsert cobre criacao da bet e mudancas de status posteriores.
    await this.prisma.bet.upsert({
      where: { id: persistence.id },
      create: persistence,
      update: {
        status: persistence.status,
        rejectedReason: persistence.rejectedReason,
        cashoutMultiplier: persistence.cashoutMultiplier,
        payoutCents: persistence.payoutCents,
        debitOperationId: persistence.debitOperationId,
        creditOperationId: persistence.creditOperationId,
        acceptedAt: persistence.acceptedAt,
        rejectedAt: persistence.rejectedAt,
        cashedOutAt: persistence.cashedOutAt,
      },
    });
  }
}
