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
    // Rodada atual e a ultima rodada visivel para a UI, inclusive no intervalo ate a proxima.
    const round = await this.prisma.round.findFirst({
      where: {
        status: {
          in: [RoundStatus.BETTING, RoundStatus.RUNNING, RoundStatus.CRASHED, RoundStatus.SETTLED],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return round ? RoundMapper.toDomain(round) : null;
  }

  async findLatest(): Promise<Round | null> {
    const round = await this.prisma.round.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return round ? RoundMapper.toDomain(round) : null;
  }

  async findHistory(pagination: { limit: number; offset: number }): Promise<Round[]> {
    // Historico considera apenas rodadas que ja possuem crash point.
    const rounds = await this.prisma.round.findMany({
      where: {
        status: {
          in: [RoundStatus.CRASHED, RoundStatus.SETTLED],
        },
        crashPoint: { not: null },
      },
      orderBy: { crashedAt: 'desc' },
      take: pagination.limit,
      skip: pagination.offset,
    });

    return rounds.map((round) => RoundMapper.toDomain(round));
  }

  async countHistory(): Promise<number> {
    return this.prisma.round.count({
      where: {
        status: {
          in: [RoundStatus.CRASHED, RoundStatus.SETTLED],
        },
        crashPoint: { not: null },
      },
    });
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
        previousServerSeedHash: persistence.previousServerSeedHash,
        hashChainIndex: persistence.hashChainIndex,
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
