import type { Bet as PrismaBet } from '@generated/prisma/client';

import { BetRejectedReason, BetStatus } from '@/domain/bet/bet-status.enum';
import { Bet } from '@/domain/bet/bet.entity';

type PersistableBet = {
  id: string;
  roundId: string;
  playerId: string;
  username: string;
  amountCents: bigint;
  status: BetStatus;
  rejectedReason?: BetRejectedReason;
  cashoutMultiplier?: number;
  payoutCents?: bigint;
  debitOperationId?: string;
  creditOperationId?: string;
  acceptedAt?: Date;
  rejectedAt?: Date;
  cashedOutAt?: Date;
};

export const BetMapper = {
  toDomain(bet: PrismaBet): Bet {
    // Recria a entidade de dominio a partir do registro persistido.
    return Bet.restore({
      id: bet.id,
      roundId: bet.roundId,
      playerId: bet.playerId,
      username: bet.username,
      amountCents: bet.amountCents,
      status: bet.status as BetStatus,
      rejectedReason: bet.rejectedReason ? (bet.rejectedReason as BetRejectedReason) : undefined,
      cashoutMultiplier: bet.cashoutMultiplier ? Number(bet.cashoutMultiplier) : undefined,
      payoutCents: bet.payoutCents ?? undefined,
      debitOperationId: bet.debitOperationId ?? undefined,
      creditOperationId: bet.creditOperationId ?? undefined,
      acceptedAt: bet.acceptedAt ?? undefined,
      rejectedAt: bet.rejectedAt ?? undefined,
      cashedOutAt: bet.cashedOutAt ?? undefined,
      createdAt: bet.createdAt,
      updatedAt: bet.updatedAt,
    });
  },

  toPersistence(bet: Bet): PersistableBet {
    // Mantem valores monetarios como bigint ate chegar no banco.
    return {
      id: bet.id,
      roundId: bet.roundId,
      playerId: bet.playerId,
      username: bet.username,
      amountCents: bet.amountCents,
      status: bet.status,
      rejectedReason: bet.rejectedReason,
      cashoutMultiplier: bet.cashoutMultiplier,
      payoutCents: bet.payoutCents,
      debitOperationId: bet.debitOperationId,
      creditOperationId: bet.creditOperationId,
      acceptedAt: bet.acceptedAt,
      rejectedAt: bet.rejectedAt,
      cashedOutAt: bet.cashedOutAt,
    };
  },
};
