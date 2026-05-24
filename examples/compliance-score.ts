// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Print the compliance dashboard for a framework.
 *
 *   CLARISMD_API_KEY=sk-... npx tsx examples/compliance-score.ts
 */

import { ClarisMD } from "../src/index.js";

async function main(): Promise<void> {
  const client = new ClarisMD();

  const score = await client.compliance.score({ framework: "hipaa" });
  console.log(
    `auto-verified: ${score.auto_verified.satisfied}/${score.auto_verified.total}`,
  );
  console.log(`manual:        ${score.manual.satisfied}/${score.manual.total}`);

  const requirements = await client.compliance.requirements({
    framework: "hipaa",
    status: "pending",
  });
  console.log(`\npending requirements (${requirements.length}):`);
  for (const r of requirements.slice(0, 10)) {
    console.log(`- ${r.code ?? r.id}: ${r.title ?? "(no title)"}`);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
