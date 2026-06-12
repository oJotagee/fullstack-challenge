import { describe, expect, it } from 'bun:test';
import { createHash } from 'crypto';

import { CrashPointCalculator } from '../../src/domain/provably-fair/crash-point-calculator';

describe('CrashPointCalculator', () => {
  it('hashes the server seed with sha256', () => {
    const calculator = new CrashPointCalculator();
    const serverSeed = 'server-seed-1';

    expect(calculator.hashSeed(serverSeed)).toBe(
      createHash('sha256').update(serverSeed).digest('hex'),
    );
  });

  it('calculates a deterministic crash point', () => {
    const calculator = new CrashPointCalculator();

    const first = calculator.calculate('server-seed-1', 'client-seed-1', 1);
    const second = calculator.calculate('server-seed-1', 'client-seed-1', 1);

    expect(second).toBe(first);
  });

  it('changes the crash point when nonce changes', () => {
    const calculator = new CrashPointCalculator();

    const first = calculator.calculate('server-seed-1', 'client-seed-1', 1);
    const second = calculator.calculate('server-seed-1', 'client-seed-1', 2);

    expect(second).not.toBe(first);
  });

  it('returns a multiplier with two decimal places and minimum 1x', () => {
    const calculator = new CrashPointCalculator();
    const crashPoint = calculator.calculate('server-seed-1', 'client-seed-1', 1);

    expect(crashPoint).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(crashPoint * 100)).toBe(true);
  });

  it('verifies that the revealed seed matches the committed hash', () => {
    const calculator = new CrashPointCalculator();
    const serverSeed = 'server-seed-1';
    const hash = calculator.hashSeed(serverSeed);

    expect(calculator.verifySeed(serverSeed, hash)).toBe(true);
    expect(calculator.verifySeed('other-seed', hash)).toBe(false);
  });

  it('rejects invalid seeds and nonce', () => {
    const calculator = new CrashPointCalculator();

    expect(() => calculator.hashSeed('')).toThrow();
    expect(() => calculator.calculate('', 'client-seed-1', 1)).toThrow();
    expect(() => calculator.calculate('server-seed-1', '', 1)).toThrow();
    expect(() => calculator.calculate('server-seed-1', 'client-seed-1', -1)).toThrow();
    expect(() => calculator.calculate('server-seed-1', 'client-seed-1', 1.5)).toThrow();
  });
});
