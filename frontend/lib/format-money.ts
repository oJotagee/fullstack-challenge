/**
 * Converts a decimal string from user input to cents (bigint-safe string).
 * "10.50" → "1050", "10" → "1000"
 */
export function decimalToCents(value: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error(`Invalid money format: "${value}"`);
  }
  const [units, decimals = ''] = value.split('.');
  const cents = BigInt(units) * 100n + BigInt(decimals.padEnd(2, '0'));
  return cents.toString();
}

/**
 * Converts a cents string from the API to a display decimal string.
 * "1050" → "10.50", "100" → "1.00"
 */
export function centsToDecimal(cents: string | number | bigint): string {
  const value = BigInt(cents);
  const units = value / 100n;
  const remainder = value % 100n;
  return `${units}.${remainder.toString().padStart(2, '0')}`;
}

/**
 * Formats cents as a currency display string.
 * "1050" → "$ 10.50"
 */
export function formatMoney(cents: string | number | bigint): string {
  return `$ ${centsToDecimal(cents)}`;
}

/**
 * Multiplies cents by a float multiplier and returns cents string.
 * Used for payout estimation only — backend is source of truth.
 */
export function multiplyCents(cents: string, multiplier: number): string {
  const multiplierCents = BigInt(Math.floor(multiplier * 100));
  const result = (BigInt(cents) * multiplierCents) / 100n;
  return result.toString();
}
