// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

// Shapes copied from the backend's pinned contract
// (clarismd-backend tests/integration/test_v1_contract_shapes.py).
const LOG = {
  id: "0b6f6a3e-5a1d-4c55-9a7e-6f0f3f1c2d4b",
  action: "PHI_REDACTED_AND_ALLOWED",
  resource_type: "llm_request",
  resource_id: null,
  details: { phi_detected: true },
  ip_address: null,
  user_agent: null,
  created_at: "2026-11-19T18:00:00.000000+00:00",
  org_id: "6b1f0c4e-0000-4000-8000-000000000001",
  user_id: "6b1f0c4e-0000-4000-8000-000000000002",
  chain_seq: 7,
  prev_hash: "a".repeat(64),
  entry_hash: "b".repeat(64),
  created_at_canonical: "2026-11-19T18:00:00.000000Z",
};

describe("audit resource", () => {
  it("list serializes Date params, forwards filters and uses offset paging", async () => {
    const m = mockFetch([
      { body: { logs: [LOG], total: 3, limit: 1, offset: 1, has_more: true } },
    ]);
    const client = makeClient(m.fetch);
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-02-01T00:00:00.000Z");
    const page = await client.audit.list({
      startDate: start,
      endDate: end,
      limit: 1,
      offset: 1,
      action: "PHI",
      resourceType: "llm_request",
      requestId: "req_x",
      phiDetected: true,
    });
    expect(page.logs).toHaveLength(1);
    expect(page.logs[0]!.chain_seq).toBe(7);
    expect([page.total, page.offset, page.has_more]).toEqual([3, 1, true]);
    const url = m.requests[0]!.url;
    expect(url).toContain("start_date=2026-01-01T00%3A00%3A00.000Z");
    expect(url).toContain("end_date=2026-02-01T00%3A00%3A00.000Z");
    expect(url).toContain("limit=1");
    expect(url).toContain("offset=1");
    expect(url).toContain("action=PHI");
    expect(url).toContain("resource_type=llm_request");
    expect(url).toContain("request_id=req_x");
    expect(url).toContain("phi_detected=true");
    expect(url).not.toContain("cursor");
  });

  it("get fetches a single audit log", async () => {
    const m = mockFetch([{ body: LOG }]);
    const client = makeClient(m.fetch);
    const log = await client.audit.get(LOG.id);
    expect(log.action).toBe("PHI_REDACTED_AND_ALLOWED");
    expect(m.requests[0]!.url).toBe(
      `https://api.test.local/v1/audit/logs/${LOG.id}`,
    );
  });

  it("export returns the typed, signed export", async () => {
    const m = mockFetch([
      {
        body: {
          export_id: "exp_abc",
          format: "json",
          record_count: 1,
          generated_at: "2026-11-19T18:00:00",
          download_url: null,
          payload: { logs: [LOG], filters: { format: "json" } },
          signature: "ed25519:84320e154b7cc8c9:c2lnbmF0dXJl",
          signature_alg: "Ed25519",
          key_id: "84320e154b7cc8c9",
          public_keys_url: "/api/v1/evidence/signing-keys",
          pdf_base64: null,
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const exp = await client.audit.export({
      startDate: "2026-01-01",
      phiDetected: true,
    });
    expect(exp.signature_alg).toBe("Ed25519");
    expect(exp.payload?.logs[0]!.entry_hash).toBe("b".repeat(64));
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent).toEqual({
      format: "json",
      start_date: "2026-01-01",
      phi_detected: true,
    });
  });

  it("export can request a PDF", async () => {
    const m = mockFetch([
      {
        body: {
          export_id: "exp_pdf",
          format: "pdf",
          record_count: 0,
          generated_at: "2026-11-19T18:00:00",
          pdf_base64: "JVBERi0=",
          signature: "ed25519:k:s",
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const exp = await client.audit.export({ format: "pdf" });
    expect(exp.pdf_base64).toBe("JVBERi0=");
    expect(JSON.parse(m.requests[0]!.body!).format).toBe("pdf");
  });
});
