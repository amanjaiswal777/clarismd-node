// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

describe("moderations resource", () => {
  it("create posts to /moderations and returns the parsed body", async () => {
    const m = mockFetch([
      {
        body: {
          id: "modr_1",
          model: "moderation-latest",
          results: [{ flagged: false, categories: {}, category_scores: {} }],
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const result = await client.moderations.create({ input: "hi" });
    expect(result.results[0]!.flagged).toBe(false);
    expect(m.requests[0]!.url).toBe(
      "https://api.test.local/v1/moderations",
    );
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.input).toBe("hi");
  });
});
