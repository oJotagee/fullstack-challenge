export class WalletNotFoundError extends Error {
  constructor(playerId: string) {
    super(`Wallet for player ${playerId} was not found.`);
    this.name = 'WalletNotFoundError';
  }
}
