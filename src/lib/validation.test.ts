import { describe, it, expect } from "vitest";
import { isValidSolanaMint } from "./validation";

describe("isValidSolanaMint", () => {
  it("accepts a valid 44-char base58 address", () => {
    // Typical Solana mint address (44 chars, base58)
    expect(isValidSolanaMint("So11111111111111111111111111111111111111112")).toBe(true);
  });

  it("accepts a valid 32-char base58 address", () => {
    expect(isValidSolanaMint("11111111111111111111111111111111")).toBe(true);
  });

  it("accepts a 43-char base58 address", () => {
    expect(isValidSolanaMint("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidSolanaMint("")).toBe(false);
  });

  it("rejects address shorter than 32 chars", () => {
    expect(isValidSolanaMint("ABC123")).toBe(false);
  });

  it("rejects address longer than 44 chars", () => {
    expect(isValidSolanaMint("A".repeat(45))).toBe(false);
  });

  it("rejects address with invalid base58 characters (0, O, I, l)", () => {
    // '0' is not valid base58
    expect(isValidSolanaMint("0" + "1".repeat(43))).toBe(false);
    // 'O' is not valid base58
    expect(isValidSolanaMint("O" + "1".repeat(43))).toBe(false);
    // 'I' is not valid base58
    expect(isValidSolanaMint("I" + "1".repeat(43))).toBe(false);
    // 'l' is not valid base58
    expect(isValidSolanaMint("l" + "1".repeat(43))).toBe(false);
  });

  it("rejects address with spaces", () => {
    expect(isValidSolanaMint("So1111111111111111111111111111111111111111 2")).toBe(false);
  });

  it("rejects address with special characters", () => {
    expect(isValidSolanaMint("So11111111111111111111111111111111111111+12")).toBe(false);
  });
});
