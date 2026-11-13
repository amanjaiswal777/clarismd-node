// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Smoke test that runs under `@cloudflare/vitest-pool-workers` to verify
 * the SDK doesn't import any Node-only API on its critical path.
 *
 * Excluded from the default `npm test` config. Invoked via
 * `npm run test:workers` (see `vitest.workerd.config.ts`).
 */

import { describe, expect, it } from "vitest";
import { ClarisMD } from "../src/index.js";

describe("Cloudflare Workers compatibility", () => {
  it("constructs a client and issues a chat request", async () => {
    const fetch = async () =>
      new Response(
        JSON.stringify({
          id: "cmpl_w",
          object: "chat.completion",
          created: 1700000000,
          model: "gpt-4o-mini",
          choices: [
            { index: 0, message: { role: "assistant", content: "ok" } },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const client = new ClarisMD({
      apiKey: "sk-test",
      baseURL: "https://api.test.local/v1",
      fetch: fetch as never,
    });
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.id).toBe("cmpl_w");
  });
});
