// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

describe("compliance resource", () => {
  it("score forwards framework", async () => {
    const m = mockFetch([
      {
        body: {
          framework: "hipaa",
          auto_verified: { satisfied: 4, total: 5 },
          manual: { satisfied: 1, total: 3 },
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const score = await client.compliance.score();
    expect(score.framework).toBe("hipaa");
    expect(m.requests[0]!.url).toContain("framework=hipaa");
  });

  it("requirements unwraps the data envelope", async () => {
    const m = mockFetch([
      {
        body: {
          data: [
            {
              id: "r_1",
              framework: "hipaa",
              acknowledgment_status: "acknowledged",
            },
          ],
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const reqs = await client.compliance.requirements();
    expect(reqs).toHaveLength(1);
    expect(reqs[0]!.id).toBe("r_1");
  });

  it("requirements tolerates a bare array response", async () => {
    const m = mockFetch([
      {
        body: [
          { id: "r_2", framework: "hipaa", acknowledgment_status: "pending" },
        ],
      },
    ]);
    const client = makeClient(m.fetch);
    const reqs = await client.compliance.requirements();
    expect(reqs).toHaveLength(1);
    expect(reqs[0]!.id).toBe("r_2");
  });

  it("evidence returns artifact array", async () => {
    const m = mockFetch([{ body: { data: [{ id: "ev_1" }] } }]);
    const client = makeClient(m.fetch);
    const ev = await client.compliance.evidence("r_1");
    expect(ev).toHaveLength(1);
  });

  it("acknowledge posts the body and unwraps the response", async () => {
    const m = mockFetch([
      {
        body: {
          data: {
            id: "r_1",
            framework: "hipaa",
            acknowledgment_status: "acknowledged",
          },
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const result = await client.compliance.acknowledge("r_1", {
      status: "acknowledged",
      notes: "reviewed",
      policyUrl: "https://example.com/policy",
    });
    expect(result.id).toBe("r_1");
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.status).toBe("acknowledged");
    expect(sent.notes).toBe("reviewed");
    expect(sent.policy_url).toBe("https://example.com/policy");
  });
});
