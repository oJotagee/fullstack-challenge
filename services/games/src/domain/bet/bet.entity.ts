import { BetRejectedReason, BetStatus } from './bet-status.enum';

const MIN_BET_CENTS = 100n;
const MAX_BET_CENTS = 100000n;

type BetProps = {
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
  createdAt: Date;
  updatedAt: Date;
};

export class Bet {
  private constructor(private readonly props: BetProps) {}

  static createPending(input: {
    id: string;
    roundId: string;
    playerId: string;
    username: string;
    amountCents: bigint | string;
    createdAt?: Date;
  }): Bet {
    const amountCents = BigInt(input.amountCents);
    const createdAt = input.createdAt ?? new Date();

    Bet.ensureBetAmount(amountCents);

    return new Bet({
      id: input.id,
      roundId: input.roundId,
      playerId: input.playerId,
      username: input.username,
      amountCents,
      status: BetStatus.PENDING_DEBIT,
      createdAt,
      updatedAt: createdAt,
    });
  }

  static restore(input: BetProps): Bet {
    return new Bet({ ...input });
  }

  accept(input: { debitOperationId: string; acceptedAt?: Date }): void {
    this.ensureStatus(BetStatus.PENDING_DEBIT, 'Only pending bets can be accepted.');

    const acceptedAt = input.acceptedAt ?? new Date();

    this.props.status = BetStatus.ACCEPTED;
    this.props.debitOperationId = input.debitOperationId;
    this.props.acceptedAt = acceptedAt;
    this.props.updatedAt = acceptedAt;
  }

  reject(input: { reason: BetRejectedReason; rejectedAt?: Date }): void {
    this.ensureStatus(BetStatus.PENDING_DEBIT, 'Only pending bets can be rejected.');

    const rejectedAt = input.rejectedAt ?? new Date();

    this.props.status = BetStatus.REJECTED;
    this.props.rejectedReason = input.reason;
    this.props.rejectedAt = rejectedAt;
    this.props.updatedAt = rejectedAt;
  }

  cashOut(input: {
    multiplier: number;
    creditOperationId: string;
    cashedOutAt?: Date;
  }): bigint {
    this.ensureStatus(BetStatus.ACCEPTED, 'Only accepted bets can cash out.');
    this.ensureMultiplier(input.multiplier);

    const cashedOutAt = input.cashedOutAt ?? new Date();
    const payoutCents = this.calculatePayout(input.multiplier);

    this.props.status = BetStatus.CASHED_OUT;
    this.props.cashoutMultiplier = input.multiplier;
    this.props.payoutCents = payoutCents;
    this.props.creditOperationId = input.creditOperationId;
    this.props.cashedOutAt = cashedOutAt;
    this.props.updatedAt = cashedOutAt;

    return payoutCents;
  }

  lose(input: { lostAt?: Date } = {}): void {
    this.ensureStatus(BetStatus.ACCEPTED, 'Only accepted bets can be lost.');

    const lostAt = input.lostAt ?? new Date();

    this.props.status = BetStatus.LOST;
    this.props.updatedAt = lostAt;
  }

  private calculatePayout(multiplier: number): bigint {
    // Multiplicador vira centavos de multiplicador; valor monetario permanece em bigint.
    const multiplierAsCents = BigInt(Math.floor(multiplier * 100));

    return (this.amountCents * multiplierAsCents) / 100n;
  }

  get id(): string {
    return this.props.id;
  }

  get roundId(): string {
    return this.props.roundId;
  }

  get playerId(): string {
    return this.props.playerId;
  }

  get username(): string {
    return this.props.username;
  }

  get amountCents(): bigint {
    return this.props.amountCents;
  }

  get status(): BetStatus {
    return this.props.status;
  }

  get rejectedReason(): BetRejectedReason | undefined {
    return this.props.rejectedReason;
  }

  get cashoutMultiplier(): number | undefined {
    return this.props.cashoutMultiplier;
  }

  get payoutCents(): bigint | undefined {
    return this.props.payoutCents;
  }

  get debitOperationId(): string | undefined {
    return this.props.debitOperationId;
  }

  get creditOperationId(): string | undefined {
    return this.props.creditOperationId;
  }

  get acceptedAt(): Date | undefined {
    return this.props.acceptedAt;
  }

  get rejectedAt(): Date | undefined {
    return this.props.rejectedAt;
  }

  get cashedOutAt(): Date | undefined {
    return this.props.cashedOutAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private ensureStatus(expected: BetStatus, message: string): void {
    if (this.props.status !== expected) {
      throw new Error(message);
    }
  }

  private ensureMultiplier(multiplier: number): void {
    if (!Number.isFinite(multiplier) || multiplier < 1) {
      throw new Error('Cashout multiplier must be greater than or equal to 1.');
    }
  }

  private static ensureBetAmount(amountCents: bigint): void {
    if (amountCents < MIN_BET_CENTS) {
      throw new Error('Bet amount must be at least 100 cents.');
    }

    if (amountCents > MAX_BET_CENTS) {
      throw new Error('Bet amount must be at most 100000 cents.');
    }
  }
}
