import type { Round as PrismaRound } from '@generated/prisma/client';

import { RoundStatus } from '@/domain/round/round-status.enum';
import { Round } from '@/domain/round/round.entity';

type PersistableRound = {
  id: string;
  status: RoundStatus;
  serverSeedHash: string;
  serverSeed?: string;
  previousServerSeedHash?: string;
  hashChainIndex?: number;
  clientSeed?: string;
  nonce?: number;
  crashPoint?: number;
  bettingStartedAt: Date;
  bettingEndsAt: Date;
  runningStartedAt?: Date;
  crashedAt?: Date;
  settledAt?: Date;
};

export const RoundMapper = {
  toDomain(round: PrismaRound): Round {
    // Converte Decimal e enums do Prisma para tipos simples do dominio.
    return Round.restore({
      id: round.id,
      status: round.status as RoundStatus,
      serverSeedHash: round.serverSeedHash,
      serverSeed: round.serverSeed ?? undefined,
      previousServerSeedHash: round.previousServerSeedHash ?? undefined,
      hashChainIndex: round.hashChainIndex ?? undefined,
      clientSeed: round.clientSeed ?? undefined,
      nonce: round.nonce ?? undefined,
      crashPoint: round.crashPoint ? Number(round.crashPoint) : undefined,
      bettingStartedAt: round.bettingStartedAt,
      bettingEndsAt: round.bettingEndsAt,
      runningStartedAt: round.runningStartedAt ?? undefined,
      crashedAt: round.crashedAt ?? undefined,
      settledAt: round.settledAt ?? undefined,
      createdAt: round.createdAt,
      updatedAt: round.updatedAt,
    });
  },

  toPersistence(round: Round): PersistableRound {
    // O repository persiste dados planos para nao expor ORM no dominio.
    return {
      id: round.id,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      serverSeed: round.serverSeed,
      previousServerSeedHash: round.previousServerSeedHash,
      hashChainIndex: round.hashChainIndex,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      crashPoint: round.crashPoint,
      bettingStartedAt: round.bettingStartedAt,
      bettingEndsAt: round.bettingEndsAt,
      runningStartedAt: round.runningStartedAt,
      crashedAt: round.crashedAt,
      settledAt: round.settledAt,
    };
  },
};
