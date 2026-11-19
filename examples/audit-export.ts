// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Export a signed audit evidence package and write it to disk.
 *
 * Verify it offline (no ClarisMD account needed) with
 *   python clarismd-backend/scripts/verify_evidence.py audit-evidence.json \
 *     --keys-url https://api.clarismd.com/api/v1/evidence/signing-keys
 *
 *   CLARISMD_API_KEY=sk-... npx tsx examples/audit-export.ts
 */

import { writeFile } from "node:fs/promises";
import { ClarisMD } from "../src/index.js";

async function main(): Promise<void> {
  const client = new ClarisMD();

  const exported = await client.audit.export({
    format: "json",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  await writeFile("./audit-evidence.json", JSON.stringify(exported, null, 2));
  console.log(
    `wrote ${exported.record_count} entries (signed ${exported.signature_alg}, key ${exported.key_id}) to ./audit-evidence.json`,
  );
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
