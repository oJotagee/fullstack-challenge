import { Injectable } from '@nestjs/common';

import type { RoundRepository } from '@/application/ports/round-repository.port';
import { RoundStatus } from '@/domain/round/round-status.enum';
import { PrismaService } from '../prisma/prisma.service';
import { Round } from '@/domain/round/round.entity';
import { RoundMapper } from './round.mapper';

@Injectable()
export class PrismaRoundRepository implements RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Round | null> {
    // Busca usada pelo endpoint de verificacao provably fair.
    const round = await this.prisma.round.findUnique({ where: { id } });

    return round ? RoundMapper.toDomain(round) : null;
  }

  async findCurrent(): Promise<Round | null> {
    // Rodada atual e a ultima ainda aberta para aposta ou em execucao.
    const round = await this.prisma.round.findFirst({
      where: {
        status: {
          in: [RoundStatus.BETTING, RoundStatus.RUNNING],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return round ? RoundMapper.toDomain(round) : null;
  }

  async findHistory(limit: number): Promise<Round[]> {
    // Historico considera apenas rodadas que ja possuem crash point.
    const rounds = await this.prisma.round.findMany({
      where: {
        status: {
          in: [RoundStatus.CRASHED, RoundStatus.SETTLED],
        },
        crashPoint: { not: null },
      },
      orderBy: { crashedAt: 'desc' },
      take: limit,
    });

    return rounds.map((round) => RoundMapper.toDomain(round));
  }

  async save(round: Round): Promise<void> {
    const persistence = RoundMapper.toPersistence(round);

    // Upsert permite criar a rodada e depois salvar transicoes do mesmo agregado.
    await this.prisma.round.upsert({
      where: { id: persistence.id },
      create: persistence,
      update: {
        status: persistence.status,
        serverSeed: persistence.serverSeed,
        clientSeed: persistence.clientSeed,
        nonce: persistence.nonce,
        crashPoint: persistence.crashPoint,
        runningStartedAt: persistence.runningStartedAt,
        crashedAt: persistence.crashedAt,
        settledAt: persistence.settledAt,
      },
    });
  }
}
