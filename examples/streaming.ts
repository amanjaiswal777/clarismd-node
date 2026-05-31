// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Streaming chat completion. Run with:
 *
 *   CLARISMD_API_KEY=oai_live_... npx tsx examples/streaming.ts
 */

import { ClarisMD } from "../src/index.js";

async function main(): Promise<void> {
  const client = new ClarisMD();

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Stream a haiku about EHRs." }],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta.content;
    if (delta) process.stdout.write(delta);
  }
  process.stdout.write("\n");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
