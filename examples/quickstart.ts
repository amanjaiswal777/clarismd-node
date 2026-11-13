// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Basic chat completion. Issue a ClarisMD API key in the dashboard
 * (Settings → API keys) — they are prefixed ``clr_live_`` — then run:
 *
 *   CLARISMD_API_KEY=clr_live_... npx tsx examples/quickstart.ts
 *
 * The example uses ``gpt-4o-mini`` so your account needs an OpenAI
 * credential attached at /settings → Integrations. To route to AWS Bedrock
 * or Google instead, change ``model`` to e.g.
 * ``anthropic.claude-3-5-sonnet-20240620-v1:0`` or ``gemini-1.5-flash``
 * and connect the matching provider.
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
