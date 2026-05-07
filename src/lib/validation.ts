/**
 * Validation utilities – zero external dependencies.
 */

const BASE58_CHARS = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Validates a Solana address syntactically (base58, 32-44 chars).
 * Works for any Solana address: mints, pools, wallets, programs, etc.
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) return false;
  return BASE58_CHARS.test(address);
}

/**
 * Alias for `isValidSolanaAddress` – kept for backward compatibility in
 * contexts where the validated value is semantically a token mint.
 */
export const isValidSolanaMint: (address: string) => boolean = isValidSolanaAddress;
