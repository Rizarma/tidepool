import { describe, it, expect } from "vitest";
import { programLabel } from "@/lib/format";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@/lib/solana-programs";

describe("programLabel", () => {
  it("returns 'SPL Token' for the Token Program ID", () => {
    expect(programLabel(TOKEN_PROGRAM_ID)).toBe("SPL Token");
  });

  it("returns 'Token-2022' for the Token-2022 Program ID", () => {
    expect(programLabel(TOKEN_2022_PROGRAM_ID)).toBe("Token-2022");
  });

  it("returns 'Unknown' when program is undefined", () => {
    expect(programLabel(undefined)).toBe("Unknown");
  });

  it("returns 'Unknown' when program is empty string", () => {
    expect(programLabel("")).toBe("Unknown");
  });

  it("returns a shortened address for an unrecognized program", () => {
    const unknownProgram = "11111111111111111111111111111111";
    const result = programLabel(unknownProgram);
    // Should be shortened: first 5 chars + ellipsis + last 5 chars
    expect(result).toBe("11111…11111");
  });

  it("returns the full string for short unrecognized programs (<=12 chars)", () => {
    const shortProgram = "ABC123";
    expect(programLabel(shortProgram)).toBe("ABC123");
  });
});
