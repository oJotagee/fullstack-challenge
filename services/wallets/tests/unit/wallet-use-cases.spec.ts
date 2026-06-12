import { describe, expect, it } from 'bun:test';

import { CreateWalletUseCase } from '../../src/application/use-cases/create-wallet.use-case';
import { CreditWalletUseCase } from '../../src/application/use-cases/credit-wallet.use-case';
import { WalletNotFoundError } from '../../src/application/use-cases/wallet-use-case.errors';
import { GetMyWalletUseCase } from '../../src/application/use-cases/get-my-wallet.use-case';
import type { WalletRepository } from '../../src/application/ports/wallet-repository.port';
import { DebitWalletUseCase } from '../../src/application/use-cases/debit-wallet.use-case';
import { DuplicatedWalletOperationError } from '../../src/domain/wallet/wallet.errors';
import { Wallet } from '../../src/domain/wallet/wallet.entity';
import { Money } from '../../src/domain/money/money.vo';

class FakeWalletRepository implements WalletRepository {
  private readonly wallets = new Map<string, Wallet>();

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    return this.wallets.get(playerId) ?? null;
  }

  async save(wallet: Wallet): Promise<void> {
    this.wallets.set(wallet.playerId, wallet);
  }
}

describe('Wallet use cases', () => {
  it('creates a wallet for a player with zero balance', async () => {
    const repository = new FakeWalletRepository();
    const useCase = new CreateWalletUseCase(repository);

    const output = await useCase.execute({ playerId: 'player-1' });

    expect(output.playerId).toBe('player-1');
    expect(output.balanceCents).toBe('0');
    expect(await repository.findByPlayerId('player-1')).not.toBeNull();
  });

  it('returns an existing wallet when create is called again for the same player', async () => {
    const repository = new FakeWalletRepository();
    const useCase = new CreateWalletUseCase(repository);

    const firstOutput = await useCase.execute({ playerId: 'player-1' });
    const secondOutput = await useCase.execute({ playerId: 'player-1' });

    expect(secondOutput).toEqual(firstOutput);
  });

  it('gets the current player wallet', async () => {
    const repository = new FakeWalletRepository();
    const wallet = Wallet.create({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: Money.fromCents(500n),
    });
    await repository.save(wallet);

    const useCase = new GetMyWalletUseCase(repository);

    await expect(useCase.execute({ playerId: 'player-1' })).resolves.toEqual({
      id: 'wallet-1',
      playerId: 'player-1',
      balanceCents: '500',
    });
  });

  it('fails when getting a wallet that does not exist', async () => {
    const repository = new FakeWalletRepository();
    const useCase = new GetMyWalletUseCase(repository);

    await expect(useCase.execute({ playerId: 'missing-player' })).rejects.toThrow(
      WalletNotFoundError,
    );
  });

  it('debits a wallet through the domain model', async () => {
    const repository = new FakeWalletRepository();
    const wallet = Wallet.create({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: Money.fromCents(1000n),
    });
    await repository.save(wallet);

    const useCase = new DebitWalletUseCase(repository);

    const output = await useCase.execute({
      playerId: 'player-1',
      amountCents: '250',
      operationId: 'op-1',
      roundId: 'round-1',
      betId: 'bet-1',
    });

    expect(output.balanceCents).toBe('750');
    expect(wallet.ledgerEntries).toHaveLength(1);
    expect(wallet.ledgerEntries[0].operationId).toBe('op-1');
  });

  it('credits a wallet through the domain model', async () => {
    const repository = new FakeWalletRepository();
    const wallet = Wallet.create({ id: 'wallet-1', playerId: 'player-1' });
    await repository.save(wallet);

    const useCase = new CreditWalletUseCase(repository);

    const output = await useCase.execute({
      playerId: 'player-1',
      amountCents: '300',
      operationId: 'op-1',
      roundId: 'round-1',
      betId: 'bet-1',
    });

    expect(output.balanceCents).toBe('300');
    expect(wallet.ledgerEntries).toHaveLength(1);
    expect(wallet.ledgerEntries[0].operationId).toBe('op-1');
  });

  it('keeps operation id idempotency in use cases', async () => {
    const repository = new FakeWalletRepository();
    const wallet = Wallet.create({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: Money.fromCents(1000n),
    });
    await repository.save(wallet);

    const useCase = new DebitWalletUseCase(repository);
    const input = {
      playerId: 'player-1',
      amountCents: '100',
      operationId: 'op-1',
      roundId: 'round-1',
      betId: 'bet-1',
    };

    await useCase.execute(input);

    await expect(useCase.execute(input)).rejects.toThrow(DuplicatedWalletOperationError);
    expect(wallet.balance.cents).toBe(900n);
  });
});
