// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

// Shapes copied from the backend's pinned contract
// (clarismd-backend tests/integration/test_v1_contract_shapes.py).
const SSN_RESULT = {
  scan_id: "scan_1",
  overall_risk_score: 0.9,
  should_block: false,
  entities: [
    {
      type: "pii",
      subtype: "ssn",
      severity: "high",
      confidence: 0.95,
      location: { start: 12, end: 23 },
      matched_pattern: "ssn",
      matched_text: "123-45-6789",
    },
  ],
  scan_duration_ms: 3.2,
};
const CLEAN_RESULT = {
  scan_id: "scan_2",
  overall_risk_score: 0,
  should_block: false,
  entities: [],
  scan_duration_ms: 1.1,
};

describe("phi.scan", () => {
  it("posts text to /phi/scan and returns one result per input", async () => {
    const m = mockFetch([{ body: { results: [SSN_RESULT] } }]);
    const client = makeClient(m.fetch);
    const response = await client.phi.scan("Patient SSN 123-45-6789");
    expect(response.results).toHaveLength(1);
    const entity = response.results[0]!.entities[0]!;
    expect(entity.subtype).toBe("ssn");
    expect(entity.location).toEqual({ start: 12, end: 23 });
    expect(JSON.parse(m.requests[0]!.body!).text).toBe(
      "Patient SSN 123-45-6789",
    );
  });

  it("supports an array of inputs, results in order", async () => {
    const m = mockFetch([{ body: { results: [CLEAN_RESULT, SSN_RESULT] } }]);
    const client = makeClient(m.fetch);
    const response = await client.phi.scan(["clean", "SSN 123-45-6789"]);
    expect(response.results.map((r) => r.entities.length > 0)).toEqual([
      false,
      true,
    ]);
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.text).toEqual(["clean", "SSN 123-45-6789"]);
  });

  it("forwards scan_types and use_ml", async () => {
    const m = mockFetch([{ body: { results: [CLEAN_RESULT] } }]);
    const client = makeClient(m.fetch);
    await client.phi.scan("hi", { scanTypes: ["pii"], useMl: true });
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.scan_types).toEqual(["pii"]);
    expect(sent.use_ml).toBe(true);
    expect(sent).not.toHaveProperty("return_entities");
  });
});
