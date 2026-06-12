import { describe, expect, it } from 'bun:test';

import { InsufficientFundsError, InvalidMoneyError } from '../../src/domain/wallet/wallet.errors';
import { Money } from '../../src/domain/money/money.vo';

describe('Money', () => {
  it('creates money from cents', () => {
    const money = Money.fromCents(1234n);

    expect(money.cents).toBe(1234n);
    expect(money.toString()).toBe('12.34');
  });

  it('creates money from cents string', () => {
    // Valores vindos de DTOs ou banco podem chegar como string para evitar perda de precisao.
    expect(Money.fromCents('1050').cents).toBe(1050n);
  });

  it('creates money from decimal string', () => {
    // O desafio exige que "10.50" seja armazenado como 1050 centavos.
    expect(Money.fromDecimal('1').cents).toBe(100n);
    expect(Money.fromDecimal('1.5').cents).toBe(150n);
    expect(Money.fromDecimal('1.50').cents).toBe(150n);
    expect(Money.fromDecimal('10.50').cents).toBe(1050n);
  });

  it('rejects invalid decimal formats', () => {
    // Mais de duas casas decimais quebraria a contabilidade em centavos.
    expect(() => Money.fromDecimal('1.999')).toThrow(InvalidMoneyError);
    expect(() => Money.fromDecimal('10.999')).toThrow(InvalidMoneyError);
    expect(() => Money.fromDecimal('-1')).toThrow(InvalidMoneyError);
    expect(() => Money.fromDecimal('abc')).toThrow(InvalidMoneyError);
  });

  it('rejects negative cents', () => {
    // Mesmo em centavos, Money nunca pode representar valor negativo.
    expect(() => Money.fromCents(-1n)).toThrow(InvalidMoneyError);
    expect(() => Money.fromCents('-1')).toThrow(InvalidMoneyError);
  });

  it('adds and subtracts money', () => {
    const balance = Money.fromDecimal('10.00');
    const amount = Money.fromDecimal('2.50');

    expect(balance.add(amount).cents).toBe(1250n);
    expect(balance.subtract(amount).cents).toBe(750n);
  });

  it('rejects subtraction when balance is insufficient', () => {
    // Money protege a invariante de que saldos nunca ficam negativos.
    expect(() => Money.fromCents(100n).subtract(Money.fromCents(101n))).toThrow(
      InsufficientFundsError,
    );
  });

  it('compares money values by cents', () => {
    const amount = Money.fromCents(1050n);

    // Igualdade precisa comparar centavos, nao referencia do objeto.
    expect(amount.equals(Money.fromDecimal('10.50'))).toBe(true);
    expect(amount.equals(Money.fromDecimal('10.51'))).toBe(false);
  });
});
