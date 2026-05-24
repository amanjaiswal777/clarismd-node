// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  isRetryableStatus,
  parseRetryAfter,
  retryDelayMs,
  RETRY_AFTER_CAP_MS,
  RETRY_BACKOFF_MS,
} from "../src/core/retry.js";
import { APIClient } from "../src/core/api-client.js";
import { NotFoundError, RateLimitError } from "../src/index.js";
import { mockFetch } from "./_helpers.js";

describe("retry helpers", () => {
  it("isRetryableStatus matches the closed set", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(504)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
  });

  it("parseRetryAfter handles seconds and dates", () => {
    expect(parseRetryAfter("3")).toBe(3000);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("not-a-date")).toBeNull();
    const future = new Date(Date.now() + 2000).toUTCString();
    const ms = parseRetryAfter(future);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThan(5000);
  });

  it("retryDelayMs uses backoff schedule + jitter", () => {
    const fixed = retryDelayMs(0, null, () => 0.5); // jitter = 0
    expect(fixed).toBe(RETRY_BACKOFF_MS[0]);
    const min = retryDelayMs(1, null, () => 0); // jitter = -25%
    const max = retryDelayMs(1, null, () => 1); // jitter = +25%
    expect(min).toBeLessThan(max);
  });

  it("retryDelayMs caps Retry-After at RETRY_AFTER_CAP_MS", () => {
    const delay = retryDelayMs(0, 600_000, () => 0.5);
    expect(delay).toBe(RETRY_AFTER_CAP_MS);
  });
});

describe("APIClient retry loop", () => {
  it("retries 503 and succeeds on second attempt", async () => {
    const m = mockFetch([
      { status: 503, body: { error: { message: "down" } } },
      { status: 200, body: { ok: true } },
    ]);
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      fetch: m.fetch,
      sleep: async () => undefined,
      random: () => 0.5,
    });
    const result = await client.request<{ ok: boolean }>({
      method: "POST",
      path: "/x",
      body: {},
    });
    expect(result.ok).toBe(true);
    expect(m.callCount()).toBe(2);
  });

  it("does not retry 4xx (non-429)", async () => {
    const m = mockFetch([
      { status: 404, body: { error: { type: "not_found", message: "x" } } },
    ]);
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      fetch: m.fetch,
      sleep: async () => undefined,
      random: () => 0.5,
    });
    await expect(
      client.request({ method: "GET", path: "/x" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(m.callCount()).toBe(1);
  });

  it("retries 429 and respects Retry-After", async () => {
    const sleeps: number[] = [];
    const m = mockFetch([
      {
        status: 429,
        headers: { "retry-after": "1" },
        body: { error: { type: "rate_limit_exceeded", message: "slow" } },
      },
      { status: 200, body: { ok: true } },
    ]);
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      fetch: m.fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: () => 0.5,
    });
    await client.request({ method: "POST", path: "/x", body: {} });
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBe(1000);
  });

  it("maxRetries=0 short-circuits retries", async () => {
    const m = mockFetch([
      { status: 503, body: { error: { message: "down" } } },
    ]);
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      maxRetries: 0,
      fetch: m.fetch,
      sleep: async () => undefined,
    });
    await expect(client.request({ method: "GET", path: "/x" })).rejects.toThrow();
    expect(m.callCount()).toBe(1);
  });

  it("retries network errors", async () => {
    let calls = 0;
    const fetch = async (..._args: unknown[]) => {
      calls += 1;
      if (calls === 1) throw new TypeError("network down");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      fetch: fetch as never,
      sleep: async () => undefined,
      random: () => 0.5,
    });
    const out = await client.request<{ ok: boolean }>({
      method: "POST",
      path: "/x",
      body: {},
    });
    expect(out.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it("surfaces RateLimitError when retries exhausted", async () => {
    const m = mockFetch([
      { status: 429, body: { error: { type: "rate_limit_exceeded", message: "x" } } },
      { status: 429, body: { error: { type: "rate_limit_exceeded", message: "x" } } },
      { status: 429, body: { error: { type: "rate_limit_exceeded", message: "x" } } },
    ]);
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      maxRetries: 2,
      fetch: m.fetch,
      sleep: async () => undefined,
      random: () => 0.5,
    });
    await expect(
      client.request({ method: "POST", path: "/x", body: {} }),
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(m.callCount()).toBe(3);
  });
});
