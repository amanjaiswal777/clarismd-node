// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { makeClient, mockFetch } from "./_helpers.js";

describe("completions resource", () => {
  it("create posts to /completions and returns the parsed body", async () => {
    const m = mockFetch([
      {
        body: {
          id: "cmpl_t",
          object: "text_completion",
          created: 1700000000,
          model: "text-001",
          choices: [{ index: 0, text: "Hello", finish_reason: "stop" }],
        },
      },
    ]);
    const client = makeClient(m.fetch);
    const result = await client.completions.create({
      model: "text-001",
      prompt: "Say hi",
    });
    expect(result.choices[0]!.text).toBe("Hello");
    const sent = JSON.parse(m.requests[0]!.body!);
    expect(sent.prompt).toBe("Say hi");
    expect(m.requests[0]!.url).toBe("https://api.test.local/v1/completions");
  });

  it("sends the governance headers on completions.create", async () => {
    const m = mockFetch([
      {
        body: {
          id: "cmpl_g",
          object: "text_completion",
          created: 1700000000,
          model: "text-001",
          choices: [{ index: 0, text: "ok", finish_reason: "stop" }],
        },
      },
    ]);
    const client = makeClient(m.fetch);
    await client.completions.create(
      { model: "text-001", prompt: "Say hi" },
      { clarismdPhiAction: "block" },
    );
    expect(m.requests[0]!.headers["x-clarismd-phi-action"]).toBe("block");
  });

  it("only governed model calls accept the governance options", () => {
    const client = makeClient(mockFetch([]).fetch);
    // Type-level guard (checked by `npm run typecheck`): embeddings has no PHI
    // scan to govern, so the options are not part of its signature. Never run.
    const call = () =>
      client.embeddings.create(
        { model: "text-embedding-3-small", input: "x" },
        // @ts-expect-error clarismdPhiAction is only for chat/completions
        { clarismdPhiAction: "block" },
      );
    expect(typeof call).toBe("function");
  });
});
