// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Detect PHI entities in arbitrary text.
 *
 *   CLARISMD_API_KEY=sk-... npx tsx examples/phi-scan.ts
 */

import { ClarisMD } from "../src/index.js";

async function main(): Promise<void> {
  const client = new ClarisMD();

  const result = await client.phi.scan(
    "Patient John Doe, DOB 1970-01-01, called about test results.",
  );

  console.log(`detected: ${result.detected}`);
  for (const entity of result.entities) {
    console.log(`- ${entity.type}: "${entity.text}" [${entity.start}-${entity.end}]`);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
