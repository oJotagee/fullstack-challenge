import { RoundStatus } from './round-status.enum';

type RoundProps = {
  id: string;
  status: RoundStatus;
  serverSeedHash: string;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
  crashPoint?: number;
  bettingStartedAt: Date;
  bettingEndsAt: Date;
  runningStartedAt?: Date;
  crashedAt?: Date;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class Round {
  private constructor(private readonly props: RoundProps) {}

  static createBetting(input: {
    id: string;
    serverSeedHash: string;
    bettingStartedAt?: Date;
    bettingEndsAt: Date;
  }): Round {
    const bettingStartedAt = input.bettingStartedAt ?? new Date();

    if (input.bettingEndsAt <= bettingStartedAt) {
      throw new Error('Betting end must be after betting start.');
    }

    return new Round({
      id: input.id,
      status: RoundStatus.BETTING,
      serverSeedHash: input.serverSeedHash,
      bettingStartedAt,
      bettingEndsAt: input.bettingEndsAt,
      createdAt: bettingStartedAt,
      updatedAt: bettingStartedAt,
    });
  }

  static restore(input: RoundProps): Round {
    return new Round({ ...input });
  }

  start(input: { clientSeed: string; nonce: number; crashPoint: number; startedAt?: Date }): void {
    this.ensureStatus(RoundStatus.BETTING, 'Only betting rounds can start.');
    this.ensureCrashPoint(input.crashPoint);

    const startedAt = input.startedAt ?? new Date();

    // Ao iniciar a rodada, congelamos os dados necessarios para verificacao futura.
    this.props.status = RoundStatus.RUNNING;
    this.props.clientSeed = input.clientSeed;
    this.props.nonce = input.nonce;
    this.props.crashPoint = input.crashPoint;
    this.props.runningStartedAt = startedAt;
    this.props.updatedAt = startedAt;
  }

  crash(input: { serverSeed: string; crashedAt?: Date }): void {
    this.ensureStatus(RoundStatus.RUNNING, 'Only running rounds can crash.');

    const crashedAt = input.crashedAt ?? new Date();

    // A seed so deve ser revelada depois do crash.
    this.props.status = RoundStatus.CRASHED;
    this.props.serverSeed = input.serverSeed;
    this.props.crashedAt = crashedAt;
    this.props.updatedAt = crashedAt;
  }

  settle(input: { settledAt?: Date } = {}): void {
    this.ensureStatus(RoundStatus.CRASHED, 'Only crashed rounds can settle.');

    const settledAt = input.settledAt ?? new Date();

    this.props.status = RoundStatus.SETTLED;
    this.props.settledAt = settledAt;
    this.props.updatedAt = settledAt;
  }

  canAcceptBets(at: Date = new Date()): boolean {
    return this.status === RoundStatus.BETTING && at < this.bettingEndsAt;
  }

  get id(): string {
    return this.props.id;
  }

  get status(): RoundStatus {
    return this.props.status;
  }

  get serverSeedHash(): string {
    return this.props.serverSeedHash;
  }

  get serverSeed(): string | undefined {
    return this.props.serverSeed;
  }

  get clientSeed(): string | undefined {
    return this.props.clientSeed;
  }

  get nonce(): number | undefined {
    return this.props.nonce;
  }

  get crashPoint(): number | undefined {
    return this.props.crashPoint;
  }

  get bettingStartedAt(): Date {
    return this.props.bettingStartedAt;
  }

  get bettingEndsAt(): Date {
    return this.props.bettingEndsAt;
  }

  get runningStartedAt(): Date | undefined {
    return this.props.runningStartedAt;
  }

  get crashedAt(): Date | undefined {
    return this.props.crashedAt;
  }

  get settledAt(): Date | undefined {
    return this.props.settledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private ensureStatus(expected: RoundStatus, message: string): void {
    if (this.props.status !== expected) {
      throw new Error(message);
    }
  }

  private ensureCrashPoint(crashPoint: number): void {
    if (!Number.isFinite(crashPoint) || crashPoint < 1) {
      throw new Error('Crash point must be greater than or equal to 1.');
    }
  }
}
