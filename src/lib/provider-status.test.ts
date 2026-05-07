/**
 * Unit tests for shared provider-status helpers.
 */

import { describe, it, expect } from "vitest";
import {
  timedFetch,
  timedFetchThrowing,
  buildSourceStatus,
  buildSourceStatusClassified,
  buildSourceStatusFromSettled,
} from "./provider-status";
import type { SettledResult, TimedResult } from "./provider-status";

describe("timedFetch", () => {
  it("returns fulfilled with data and latencyMs on success", async () => {
    const result = await timedFetch("test", () => Promise.resolve({ foo: 1 }));
    expect(result.status).toBe("fulfilled");
    if (result.status === "fulfilled") {
      expect(result.value.data).toEqual({ foo: 1 });
      expect(typeof result.value.latencyMs).toBe("number");
      expect(result.value.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns rejected with reason on failure", async () => {
    const result = await timedFetch("test", () =>
      Promise.reject(new Error("boom")),
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason?.message).toBe("boom");
    }
  });

  it("wraps non-Error rejections into { message } shape", async () => {
    const result = await timedFetch("test", () =>
      Promise.reject("string error"),
    );
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.reason?.message).toBe("string error");
    }
  });
});

describe("timedFetchThrowing", () => {
  it("returns TimedResult on success", async () => {
    const result = await timedFetchThrowing("test", () =>
      Promise.resolve("data"),
    );
    expect(result.data).toBe("data");
    expect(typeof result.latencyMs).toBe("number");
  });

  it("throws on failure (for use with Promise.allSettled)", async () => {
    await expect(
      timedFetchThrowing("test", () => Promise.reject(new Error("fail"))),
    ).rejects.toThrow("fail");
  });
});

describe("buildSourceStatus", () => {
  it("returns success status with latencyMs for fulfilled result", () => {
    const result: SettledResult<string> = {
      status: "fulfilled",
      value: { data: "ok", latencyMs: 42 },
    };
    const status = buildSourceStatus("my_provider", result);
    expect(status).toEqual({
      provider: "my_provider",
      success: true,
      latencyMs: 42,
    });
  });

  it("returns failure status with sanitized error for rejected result", () => {
    const result: SettledResult<string> = {
      status: "rejected",
      reason: { message: "HTTP 503 from internal" },
    };
    const status = buildSourceStatus("my_provider", result);
    expect(status.provider).toBe("my_provider");
    expect(status.success).toBe(false);
    expect(status.error).toBe("Provider unavailable");
    expect(status.code).toBeUndefined();
  });
});

describe("buildSourceStatusClassified", () => {
  it("includes error code for rejected result", () => {
    const result: SettledResult<string> = {
      status: "rejected",
      reason: { message: "HTTP 503" },
    };
    const status = buildSourceStatusClassified("my_provider", result);
    expect(status.provider).toBe("my_provider");
    expect(status.success).toBe(false);
    expect(status.code).toBe("PROVIDER_UNAVAILABLE");
    expect(status.error).toBe("Provider unavailable");
  });

  it("returns success status without code for fulfilled result", () => {
    const result: SettledResult<string> = {
      status: "fulfilled",
      value: { data: "ok", latencyMs: 10 },
    };
    const status = buildSourceStatusClassified("my_provider", result);
    expect(status).toEqual({
      provider: "my_provider",
      success: true,
      latencyMs: 10,
    });
  });
});

describe("buildSourceStatusFromSettled", () => {
  it("handles native PromiseSettledResult fulfilled", () => {
    const result: PromiseSettledResult<TimedResult<string>> = {
      status: "fulfilled",
      value: { data: "ok", latencyMs: 5 },
    };
    const status = buildSourceStatusFromSettled("provider", result);
    expect(status).toEqual({
      provider: "provider",
      success: true,
      latencyMs: 5,
    });
  });

  it("handles native PromiseSettledResult rejected", () => {
    const result: PromiseSettledResult<TimedResult<string>> = {
      status: "rejected",
      reason: new Error("timeout"),
    };
    const status = buildSourceStatusFromSettled("provider", result);
    expect(status.provider).toBe("provider");
    expect(status.success).toBe(false);
    expect(status.error).toBe("Timed out");
  });
});
