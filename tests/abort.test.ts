// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { APIConnectionError, APITimeoutError } from "../src/index.js";
import { APIClient } from "../src/core/api-client.js";

describe("AbortSignal handling", () => {
  it("caller-cancelled requests surface as APIConnectionError without retry", async () => {
    let calls = 0;
    const fetch = async (_url: string, init?: RequestInit) => {
      calls += 1;
      // Mimic an aborted fetch: throw an AbortError with the signal's reason.
      const reason = init?.signal?.reason;
      const err = new Error("aborted");
      err.name = "AbortError";
      throw reason ?? err;
    };
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      maxRetries: 5,
      fetch: fetch as never,
      sleep: async () => undefined,
    });
    const controller = new AbortController();
    controller.abort(new DOMException("user cancelled", "AbortError"));
    await expect(
      client.request({ method: "GET", path: "/x", options: { signal: controller.signal } }),
    ).rejects.toBeInstanceOf(APIConnectionError);
    expect(calls).toBe(1);
  });

  it("timeout aborts surface as APITimeoutError and retry", async () => {
    let calls = 0;
    const fetch = async (_url: string, init?: RequestInit) => {
      calls += 1;
      if (calls === 1) {
        // First call: the timeout signal aborts before we resolve.
        await new Promise<void>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("timeout");
            err.name = "AbortError";
            reject(err);
          });
        });
        // Unreachable
        throw new Error("never");
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      timeout: 10,
      fetch: fetch as never,
      sleep: async () => undefined,
      random: () => 0.5,
    });
    const result = await client.request<{ ok: boolean }>({
      method: "POST",
      path: "/x",
      body: {},
    });
    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it("timeout exhausted with maxRetries=0 throws APITimeoutError", async () => {
    const fetch = async (_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("timeout");
          err.name = "AbortError";
          reject(err);
        });
      });
    };
    const client = new APIClient({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      timeout: 10,
      maxRetries: 0,
      fetch: fetch as never,
      sleep: async () => undefined,
    });
    await expect(
      client.request({ method: "GET", path: "/x" }),
    ).rejects.toBeInstanceOf(APITimeoutError);
  });
});
