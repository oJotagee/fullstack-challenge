import { createHash, createHmac } from 'crypto';

export class CrashPointCalculator {
  constructor() {}

  hashSeed(serverSeed: string): string {
    if (!serverSeed.trim()) {
      throw new Error('Server seed is required.');
    }

    return createHash('sha256').update(serverSeed).digest('hex');
  }

  verifySeed(serverSeed: string, expectedHash: string): boolean {
    return this.hashSeed(serverSeed) === expectedHash;
  }

  calculate(serverSeed: string, clientSeed: string, nonce: number): number {
    if (!serverSeed.trim()) {
      throw new Error('Server seed is required.');
    }

    if (!clientSeed.trim()) {
      throw new Error('Client seed is required.');
    }

    if (!Number.isInteger(nonce) || nonce < 0) {
      throw new Error('Nonce must be a non-negative integer.');
    }

    // HMAC torna o ponto de crash deterministico e verificavel depois que a seed e revelada.
    const hmac = createHmac('sha256', serverSeed)
      .update(`${clientSeed}:${nonce}`)
      .digest('hex');

    const value = Number.parseInt(hmac.slice(0, 13), 16);
    const max = 0x1fffffffffffff;
    const ratio = value / max;
    const raw = 0.99 / Math.max(1 - ratio, 0.000001);

    // Multiplicador de jogo fica com duas casas; dinheiro continua em centavos fora daqui.
    return Math.max(1, Math.floor(raw * 100) / 100);
  }
}
