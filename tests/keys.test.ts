// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

// Shape copied from the backend's pinned contract
// (clarismd-backend tests/integration/test_v1_contract_shapes.py).
const KEY = {
  id: "5d1c3f7e-1a2b-4c3d-8e9f-001122334455",
  key_prefix: "cmd_live_ab12",
  name: "ci",
  permissions: ["chat"],
  expires_at: "2026-12-19T18:00:00+00:00",
  revoked: false,
  last_used: null,
  created_by_session_id: null,
  created_at: "2026-11-19T18:00:00+00:00",
  key: null,
};

describe("keys resource", () => {
  it("list returns the bare key metadata array", async () => {
    const m = mockFetch([{ body: [KEY] }]);
    const client = makeClient(m.fetch);
    const keys = await client.keys.list();
    expect(keys).toHaveLength(1);
    expect(keys[0]!.key_prefix).toBe("cmd_live_ab12");
    expect(keys[0]!.key).toBeNull();
  });

  it("create sends permissions/expires_in_days and returns the secret in `key`", async () => {
    const m = mockFetch([
      { status: 201, body: { ...KEY, key: "cmd_live_ab12secretsecret" } },
    ]);
    const client = makeClient(m.fetch);
    const key = await client.keys.create({
      name: "ci",
      permissions: ["chat"],
      expiresInDays: 30,
    });
    expect(key.key).toBe("cmd_live_ab12secretsecret");
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent).toEqual({
      name: "ci",
      permissions: ["chat"],
      expires_in_days: 30,
    });
  });

  it("create works with no params", async () => {
    const m = mockFetch([{ status: 201, body: { ...KEY, key: "s" } }]);
    const client = makeClient(m.fetch);
    await client.keys.create();
    expect(JSON.parse(m.requests[0]!.body!)).toEqual({});
  });

  it("get fetches metadata without a secret", async () => {
    const m = mockFetch([{ body: { ...KEY, revoked: true } }]);
    const client = makeClient(m.fetch);
    const key = await client.keys.get(KEY.id);
    expect(key.revoked).toBe(true);
    expect(key.key).toBeNull();
  });

  it("rejects an unexpected envelope instead of returning nothing", async () => {
    const m = mockFetch([{ body: { data: [KEY] } }]);
    const client = makeClient(m.fetch);
    await expect(client.keys.list()).rejects.toThrow(/Unexpected key list/);
  });

  it("delete resolves to void on 204", async () => {
    const m = mockFetch([{ status: 204, text: "" }]);
    const client = makeClient(m.fetch);
    const result = await client.keys.delete(KEY.id);
    expect(result).toBeUndefined();
    expect(m.requests[0]!.method).toBe("DELETE");
  });
});
