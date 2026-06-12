import { InvalidMoneyError, InsufficientFundsError } from '../wallet/wallet.errors';

export class Money {
  private constructor(readonly cents: bigint) {
    // Dinheiro pode ser zero em uma carteira vazia, mas nunca negativo.
    if (cents < 0n) {
      throw new InvalidMoneyError('Money cannot be negative.');
    }
  }

  static fromCents(cents: bigint | string): Money {
    return new Money(BigInt(cents));
  }

  static fromDecimal(input: string): Money {
    // Aceita apenas unidades inteiras ou duas casas decimais e armazena em centavos.
    if (!/^\d+(\.\d{1,2})?$/.test(input)) {
      throw new InvalidMoneyError('Invalid money format.');
    }

    const [units, decimals = ''] = input.split('.');

    return new Money(BigInt(units) * 100n + BigInt(decimals.padEnd(2, '0')));
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    // Impede que o saldo fique negativo antes de criar o novo value object.
    if (!this.isGreaterThanOrEqual(other)) {
      throw new InsufficientFundsError();
    }

    return new Money(this.cents - other.cents);
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.cents >= other.cents;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toString(): string {
    const units = this.cents / 100n;
    const decimals = this.cents % 100n;

    return `${units}.${decimals.toString().padStart(2, '0')}`;
  }
}
