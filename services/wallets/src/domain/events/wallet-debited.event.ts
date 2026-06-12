export type WalletDebitedEvent = {
  type: 'wallet.debited';
  occurredAt: Date;
  payload: {
    operationId: string;
    walletId: string;
    playerId: string;
    roundId?: string;
    betId?: string;
    amountCents: string;
    balanceCents: string;
  };
};
