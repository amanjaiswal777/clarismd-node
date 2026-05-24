// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { ClarisMD, ClarisMDError } from "../src/index.js";
import { mockFetch } from "./_helpers.js";

describe("ClarisMD constructor", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when no API key is available", () => {
    vi.stubEnv("CLARISMD_API_KEY", "");
    expect(() => new ClarisMD({ fetch: (async () => new Response()) as never }))
      .toThrow(ClarisMDError);
  });

  it("reads CLARISMD_API_KEY from the environment", async () => {
    vi.stubEnv("CLARISMD_API_KEY", "sk-env");
    const m = mockFetch([{ body: { ok: true } }]);
    const client = new ClarisMD({ fetch: m.fetch });
    await client.audit.list().catch(() => undefined);
    expect(m.requests[0]!.headers["authorization"]).toBe("Bearer sk-env");
  });

  it("reads CLARISMD_BASE_URL from the environment", async () => {
    vi.stubEnv("CLARISMD_API_KEY", "sk-env");
    vi.stubEnv("CLARISMD_BASE_URL", "https://gateway.example.org/api");
    const m = mockFetch([{ body: { data: [] } }]);
    const client = new ClarisMD({ fetch: m.fetch });
    await client.audit.list();
    expect(m.requests[0]!.url).toBe(
      "https://gateway.example.org/api/audit/logs",
    );
  });

  it("accepts a custom fetch", async () => {
    let called = false;
    const fetch = async () => {
      called = true;
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const client = new ClarisMD({ apiKey: "sk-x", fetch: fetch as never });
    await client.audit.list();
    expect(called).toBe(true);
  });

  it("exposes all resource namespaces", () => {
    const client = new ClarisMD({
      apiKey: "sk",
      fetch: (async () => new Response()) as never,
    });
    expect(client.chat.completions).toBeDefined();
    expect(client.completions).toBeDefined();
    expect(client.embeddings).toBeDefined();
    expect(client.moderations).toBeDefined();
    expect(client.phi).toBeDefined();
    expect(client.audit).toBeDefined();
    expect(client.compliance).toBeDefined();
    expect(client.keys).toBeDefined();
  });
});
