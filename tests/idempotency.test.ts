// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  IDEMPOTENCY_KEY_PREFIX,
  generateIdempotencyKey,
  generateUUID,
} from "../src/core/idempotency.js";
import { makeClient, mockFetch } from "./_helpers.js";

describe("idempotency key generator", () => {
  it("generates a cmd-ts-prefixed UUID", () => {
    const key = generateIdempotencyKey();
    expect(key.startsWith(`${IDEMPOTENCY_KEY_PREFIX}-`)).toBe(true);
    expect(key.length).toBeGreaterThan(IDEMPOTENCY_KEY_PREFIX.length + 30);
  });

  it("produces unique keys", () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();
    expect(a).not.toBe(b);
  });

  it("generateUUID matches the v4 shape", () => {
    expect(generateUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("idempotency header behavior", () => {
  it("auto-generates the header on POST", async () => {
    const m = mockFetch([{ body: { id: "cmpl_x", choices: [] } }]);
    const client = makeClient(m.fetch);
    await client.embeddings.create({ model: "m", input: "hi" });
    expect(m.requests[0]!.headers["idempotency-key"]).toMatch(/^cmd-ts-/);
  });

  it("does NOT add the header on GET", async () => {
    const m = mockFetch([{ body: { data: [] } }]);
    const client = makeClient(m.fetch);
    await client.audit.list();
    expect(m.requests[0]!.headers["idempotency-key"]).toBeUndefined();
  });

  it("does NOT add the header on DELETE", async () => {
    const m = mockFetch([{ status: 204, text: "" }]);
    const client = makeClient(m.fetch);
    await client.keys.delete("k_1");
    expect(m.requests[0]!.headers["idempotency-key"]).toBeUndefined();
  });
});
