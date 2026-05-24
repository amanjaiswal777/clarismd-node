// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

describe("audit resource", () => {
  it("list serializes Date params and forwards filters", async () => {
    const m = mockFetch([
      { body: { data: [{ id: "log_1" }], next_cursor: null, has_more: false } },
    ]);
    const client = makeClient(m.fetch);
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-02-01T00:00:00.000Z");
    const result = await client.audit.list({
      startDate: start,
      endDate: end,
      limit: 10,
      cursor: "c1",
      requestId: "req_x",
      phiDetected: true,
    });
    expect(result.data).toHaveLength(1);
    const url = m.requests[0]!.url;
    expect(url).toContain("start_date=2026-01-01T00%3A00%3A00.000Z");
    expect(url).toContain("end_date=2026-02-01T00%3A00%3A00.000Z");
    expect(url).toContain("limit=10");
    expect(url).toContain("cursor=c1");
    expect(url).toContain("request_id=req_x");
    expect(url).toContain("phi_detected=true");
  });

  it("get fetches a single audit log", async () => {
    const m = mockFetch([{ body: { id: "log_42" } }]);
    const client = makeClient(m.fetch);
    const log = await client.audit.get("log_42");
    expect(log.id).toBe("log_42");
    expect(m.requests[0]!.url).toBe(
      "https://api.test.local/v1/audit/logs/log_42",
    );
  });

  it("export returns a Blob", async () => {
    const m = mockFetch([
      {
        text: '{"some":"export"}',
        headers: { "content-type": "application/json" },
      },
    ]);
    const client = makeClient(m.fetch);
    const blob = await client.audit.export({
      format: "json",
      startDate: "2026-01-01",
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(await blob.text()).toBe('{"some":"export"}');
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.format).toBe("json");
    expect(sent.start_date).toBe("2026-01-01");
  });
});
