export class CurrentRoundNotFoundError extends Error {
  constructor() {
    super('Current round was not found.');
  }
}

export class RoundNotFoundError extends Error {
  constructor(roundId: string) {
    super(`Round ${roundId} was not found.`);
  }
}

export class RoundNotBettingError extends Error {
  constructor() {
    super('Round is not accepting bets.');
  }
}

export class RoundNotRunningError extends Error {
  constructor() {
    super('Round is not running.');
  }
}

export class DuplicatedBetError extends Error {
  constructor(roundId: string, playerId: string) {
    super(`Player ${playerId} already has a bet in round ${roundId}.`);
  }
}

export class BetNotFoundError extends Error {
  constructor(playerId: string) {
    super(`Bet for player ${playerId} was not found in the current round.`);
  }
}

export class RoundFairnessNotRevealedError extends Error {
  constructor(roundId: string) {
    super(`Round ${roundId} has not revealed fairness data yet.`);
  }
}
