import { describe, it, expect } from "vitest";
import { isValidSolanaAddress, isValidSolanaMint } from "./validation";

describe("isValidSolanaAddress", () => {
  it("accepts a valid 44-char base58 address", () => {
    // Typical Solana address (44 chars, base58)
    expect(isValidSolanaAddress("So11111111111111111111111111111111111111112")).toBe(true);
  });

  it("accepts a valid 32-char base58 address", () => {
    expect(isValidSolanaAddress("11111111111111111111111111111111")).toBe(true);
  });

  it("accepts a 43-char base58 address", () => {
    expect(isValidSolanaAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidSolanaAddress("")).toBe(false);
  });

  it("rejects address shorter than 32 chars", () => {
    expect(isValidSolanaAddress("ABC123")).toBe(false);
  });

  it("rejects address longer than 44 chars", () => {
    expect(isValidSolanaAddress("A".repeat(45))).toBe(false);
  });

  it("rejects address with invalid base58 characters (0, O, I, l)", () => {
    // '0' is not valid base58
    expect(isValidSolanaAddress("0" + "1".repeat(43))).toBe(false);
    // 'O' is not valid base58
    expect(isValidSolanaAddress("O" + "1".repeat(43))).toBe(false);
    // 'I' is not valid base58
    expect(isValidSolanaAddress("I" + "1".repeat(43))).toBe(false);
    // 'l' is not valid base58
    expect(isValidSolanaAddress("l" + "1".repeat(43))).toBe(false);
  });

  it("rejects address with spaces", () => {
    expect(isValidSolanaAddress("So1111111111111111111111111111111111111111 2")).toBe(false);
  });

  it("rejects address with special characters", () => {
    expect(isValidSolanaAddress("So11111111111111111111111111111111111111+12")).toBe(false);
  });
});

describe("isValidSolanaMint (alias)", () => {
  it("is the same function as isValidSolanaAddress", () => {
    expect(isValidSolanaMint).toBe(isValidSolanaAddress);
  });

  it("accepts a valid mint address", () => {
    expect(isValidSolanaMint("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(true);
  });

  it("rejects an invalid address", () => {
    expect(isValidSolanaMint("invalid")).toBe(false);
  });
});
