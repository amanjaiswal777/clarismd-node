// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

describe("health.check", () => {
  it("issues GET /health and returns the typed status", async () => {
    const m = mockFetch([{ body: { status: "ok", version: "0.4.2" } }]);
    const client = makeClient(m.fetch);

    const status = await client.health.check();

    expect(status.status).toBe("ok");
    expect(status.version).toBe("0.4.2");
    expect(m.requests[0]!.method).toBe("GET");
    expect(m.requests[0]!.url).toBe("https://api.test.local/v1/health");
  });

  it("does not attach an Idempotency-Key (GET request)", async () => {
    const m = mockFetch([{ body: { status: "ok" } }]);
    const client = makeClient(m.fetch);

    await client.health.check();

    expect(m.requests[0]!.headers["idempotency-key"]).toBeUndefined();
  });

  it("forwards extra headers and respects the abort signal", async () => {
    const m = mockFetch([{ body: { status: "ok" } }]);
    const client = makeClient(m.fetch);
    const ctrl = new AbortController();

    await client.health.check({
      headers: { "x-trace-id": "trace-123" },
      signal: ctrl.signal,
    });

    expect(m.requests[0]!.headers["x-trace-id"]).toBe("trace-123");
    expect(m.requests[0]!.signal).not.toBeNull();
  });

  it("preserves passthrough fields in the typed response", async () => {
    const m = mockFetch([
      { body: { status: "ok", version: "0.4.2", uptime_s: 12345 } },
    ]);
    const client = makeClient(m.fetch);

    const status = await client.health.check();

    expect(status["uptime_s"]).toBe(12345);
  });
});
