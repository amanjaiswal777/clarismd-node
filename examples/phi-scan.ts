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

  const { results } = await client.phi.scan(
    "Patient John Doe, DOB 1970-01-01, called about test results.",
  );
  const result = results[0]!;

  console.log(`detected: ${result.entities.length > 0}`);
  for (const entity of result.entities) {
    console.log(
      `- ${entity.subtype ?? entity.type}: "${entity.matched_text ?? ""}" [${entity.location.start}-${entity.location.end}]`,
    );
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
