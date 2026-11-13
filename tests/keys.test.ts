// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

describe("keys resource", () => {
  it("list returns key metadata array", async () => {
    const m = mockFetch([{ body: { data: [{ id: "k_1", name: "primary" }] } }]);
    const client = makeClient(m.fetch);
    const keys = await client.keys.list();
    expect(keys).toHaveLength(1);
    expect(keys[0]!.id).toBe("k_1");
  });

  it("create returns the secret on the create response", async () => {
    const m = mockFetch([
      {
        body: {
          id: "k_2",
          name: "ci",
          prefix: "sk-test-",
          secret: "sk-test-abcdef",
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const key = await client.keys.create({ name: "ci", scopes: ["read"] });
    expect(key.secret).toBe("sk-test-abcdef");
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.name).toBe("ci");
    expect(sent.scopes).toEqual(["read"]);
  });

  it("get fetches metadata without a secret", async () => {
    const m = mockFetch([
      { body: { id: "k_2", name: "ci", prefix: "sk-test-" } },
    ]);
    const client = makeClient(m.fetch);
    const key = await client.keys.get("k_2");
    expect(key.id).toBe("k_2");
    expect(key.secret).toBeUndefined();
  });

  it("delete resolves to void on 204", async () => {
    const m = mockFetch([{ status: 204, text: "" }]);
    const client = makeClient(m.fetch);
    const result = await client.keys.delete("k_2");
    expect(result).toBeUndefined();
    expect(m.requests[0]!.method).toBe("DELETE");
  });
});
