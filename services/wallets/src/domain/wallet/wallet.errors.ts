export class InvalidMoneyError extends Error {
  constructor(message = 'Invalid money amount.') {
    super(message);
    this.name = 'InvalidMoneyError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient funds.') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

export class DuplicatedWalletOperationError extends Error {
  constructor(operationId: string) {
    super(`Operation with ID ${operationId} has already been processed.`);
    this.name = 'DuplicatedWalletOperationError';
  }
}
