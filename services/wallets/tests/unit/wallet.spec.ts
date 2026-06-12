import { describe, expect, it } from 'bun:test';

import { LedgerEntryType } from '../../src/domain/wallet/ledger-entry-type.enum';
import { LedgerEntry } from '../../src/domain/wallet/ledger-entry.entity';
import { Wallet } from '../../src/domain/wallet/wallet.entity';
import { Money } from '../../src/domain/money/money.vo';
import {
  DuplicatedWalletOperationError,
  InsufficientFundsError,
  InvalidMoneyError,
} from '../../src/domain/wallet/wallet.errors';

describe('Wallet', () => {
  it('creates a wallet with zero balance by default', () => {
    const wallet = Wallet.create({ id: 'wallet-1', playerId: 'player-1' });

    expect(wallet.balance.cents).toBe(0n);
    expect(wallet.ledgerEntries).toHaveLength(0);
  });

  it('credits balance and records a ledger entry with trace data', () => {
    // Creditos vêm de comandos assincronos e precisam manter rastreio com o jogo.
    const wallet = Wallet.create({ id: 'wallet-1', playerId: 'player-1' });

    const entry = wallet.credit({
      entryId: 'entry-1',
      operationId: 'op-1',
      amount: Money.fromCents(500n),
      roundId: 'round-1',
      betId: 'bet-1',
      metadata: { source: 'wallet.credit.requested' },
    });

    expect(wallet.balance.cents).toBe(500n);
    expect(entry.type).toBe(LedgerEntryType.CREDIT);
    expect(entry.balanceAfter.cents).toBe(500n);
    expect(entry.roundId).toBe('round-1');
    expect(entry.betId).toBe('bet-1');
    expect(entry.metadata).toEqual({ source: 'wallet.credit.requested' });
    expect(wallet.ledgerEntries).toHaveLength(1);
  });

  it('exposes ledger entry data for persistence', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    const entry = LedgerEntry.create({
      id: 'entry-1',
      walletId: 'wallet-1',
      operationId: 'op-1',
      type: LedgerEntryType.CREDIT,
      amount: Money.fromCents(500n),
      balanceAfter: Money.fromCents(1500n),
      roundId: 'round-1',
      betId: 'bet-1',
      metadata: { source: 'test', retry: 1, compensated: false, note: null },
      createdAt,
    });

    expect(entry.id).toBe('entry-1');
    expect(entry.walletId).toBe('wallet-1');
    expect(entry.operationId).toBe('op-1');
    expect(entry.type).toBe(LedgerEntryType.CREDIT);
    expect(entry.amount.cents).toBe(500n);
    expect(entry.balanceAfter.cents).toBe(1500n);
    expect(entry.roundId).toBe('round-1');
    expect(entry.betId).toBe('bet-1');
    expect(entry.metadata).toEqual({
      source: 'test',
      retry: 1,
      compensated: false,
      note: null,
    });
    expect(entry.createdAt).toBe(createdAt);
  });

  it('debits balance and records balance after the operation', () => {
    // Debitos reservam o valor da aposta e registram o saldo resultante no ledger.
    const wallet = Wallet.create({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: Money.fromCents(1000n),
    });

    const entry = wallet.debit({
      entryId: 'entry-1',
      operationId: 'op-1',
      amount: Money.fromCents(250n),
      roundId: 'round-1',
      betId: 'bet-1',
    });

    expect(wallet.balance.cents).toBe(750n);
    expect(entry.type).toBe(LedgerEntryType.DEBIT);
    expect(entry.balanceAfter.cents).toBe(750n);
  });

  it('rejects debit when balance is insufficient', () => {
    // O dominio da wallet rejeita debitos que deixariam o saldo negativo.
    const wallet = Wallet.create({ id: 'wallet-1', playerId: 'player-1' });

    expect(() =>
      wallet.debit({
        entryId: 'entry-1',
        operationId: 'op-1',
        amount: Money.fromCents(1n),
      }),
    ).toThrow(InsufficientFundsError);

    expect(wallet.balance.cents).toBe(0n);
    expect(wallet.ledgerEntries).toHaveLength(0);
  });

  it('rejects zero amount credit and debit operations', () => {
    // A wallet pode nascer zerada, mas operacoes financeiras precisam mover dinheiro.
    const wallet = Wallet.create({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: Money.fromCents(100n),
    });

    expect(() =>
      wallet.credit({
        entryId: 'entry-1',
        operationId: 'op-1',
        amount: Money.fromCents(0n),
      }),
    ).toThrow(InvalidMoneyError);

    expect(() =>
      wallet.debit({
        entryId: 'entry-2',
        operationId: 'op-2',
        amount: Money.fromCents(0n),
      }),
    ).toThrow(InvalidMoneyError);

    expect(wallet.balance.cents).toBe(100n);
    expect(wallet.ledgerEntries).toHaveLength(0);
  });

  it('rejects duplicated operation ids', () => {
    // Mensagens assincronas repetidas nao podem aplicar a mesma operacao duas vezes.
    const wallet = Wallet.create({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: Money.fromCents(1000n),
    });

    wallet.debit({
      entryId: 'entry-1',
      operationId: 'op-1',
      amount: Money.fromCents(100n),
    });

    expect(() =>
      wallet.credit({
        entryId: 'entry-2',
        operationId: 'op-1',
        amount: Money.fromCents(100n),
      }),
    ).toThrow(DuplicatedWalletOperationError);
  });

  it('restores processed operation ids from existing ledger entries', () => {
    // A persistencia recarrega o ledger, entao a idempotencia deve sobreviver a reinicios.
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:01:00.000Z');
    const entry = LedgerEntry.create({
      id: 'entry-1',
      walletId: 'wallet-1',
      operationId: 'op-1',
      type: LedgerEntryType.CREDIT,
      amount: Money.fromCents(100n),
      balanceAfter: Money.fromCents(100n),
    });

    const wallet = Wallet.restore({
      id: 'wallet-1',
      playerId: 'player-1',
      balance: Money.fromCents(100n),
      ledgerEntries: [entry],
      createdAt,
      updatedAt,
    });

    expect(wallet.id).toBe('wallet-1');
    expect(wallet.playerId).toBe('player-1');
    expect(wallet.createdAt).toBe(createdAt);
    expect(wallet.updatedAt).toBe(updatedAt);

    expect(() =>
      wallet.credit({
        entryId: 'entry-2',
        operationId: 'op-1',
        amount: Money.fromCents(100n),
      }),
    ).toThrow(DuplicatedWalletOperationError);
  });

  it('publishes domain events and clears them after pulling', () => {
    // Eventos de dominio sao coletados uma vez para a aplicacao publicar integracoes.
    const wallet = Wallet.create({ id: 'wallet-1', playerId: 'player-1' });

    wallet.credit({
      entryId: 'entry-1',
      operationId: 'op-1',
      amount: Money.fromCents(100n),
      roundId: 'round-1',
      betId: 'bet-1',
    });

    const events = wallet.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('wallet.credited');
    expect(events[0].payload).toEqual({
      operationId: 'op-1',
      walletId: 'wallet-1',
      playerId: 'player-1',
      roundId: 'round-1',
      betId: 'bet-1',
      amountCents: '100',
      balanceCents: '100',
    });
    expect(wallet.pullDomainEvents()).toHaveLength(0);
  });
});
