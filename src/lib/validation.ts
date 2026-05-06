/**
 * Validation utilities – zero external dependencies.
 */

const BASE58_CHARS = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Validates a Solana mint address (base58, 32-44 chars).
 */
export function isValidSolanaMint(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) return false;
  return BASE58_CHARS.test(address);
}
