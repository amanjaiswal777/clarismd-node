// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Basic chat completion. Run with:
 *
 *   CLARISMD_API_KEY=sk-... npx tsx examples/quickstart.ts
 */

import { ClarisMD } from "../src/index.js";

async function main(): Promise<void> {
  const client = new ClarisMD();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a clinical documentation assistant.",
      },
      {
        role: "user",
        content: "Summarize this discharge plan for a non-clinical reader.",
      },
    ],
  });

  console.log(completion.choices[0]?.message.content);
  console.log("usage:", completion.usage);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
