// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

describe("phi.scan", () => {
  it("posts text to /phi/scan and returns result", async () => {
    const m = mockFetch([
      {
        body: {
          detected: true,
          entities: [{ type: "EMAIL", text: "a@b.com", start: 0, end: 7 }],
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const result = await client.phi.scan("a@b.com");
    expect(result.detected).toBe(true);
    expect(result.entities).toHaveLength(1);
    expect(JSON.parse(m.requests[0]!.body!).text).toBe("a@b.com");
  });

  it("supports an array of inputs", async () => {
    const m = mockFetch([{ body: { detected: false, entities: [] } }]);
    const client = makeClient(m.fetch);
    const result = await client.phi.scan(["clean1", "clean2"]);
    expect(result.detected).toBe(false);
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.text).toEqual(["clean1", "clean2"]);
  });

  it("forwards return_entities option", async () => {
    const m = mockFetch([{ body: { detected: false, entities: [] } }]);
    const client = makeClient(m.fetch);
    await client.phi.scan("hi", { returnEntities: false });
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.return_entities).toBe(false);
  });
});
