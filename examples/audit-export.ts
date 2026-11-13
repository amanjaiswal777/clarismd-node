// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Export an audit evidence package and write it to disk.
 *
 *   CLARISMD_API_KEY=sk-... npx tsx examples/audit-export.ts
 */

import { writeFile } from "node:fs/promises";
import { ClarisMD } from "../src/index.js";

async function main(): Promise<void> {
  const client = new ClarisMD();

  const blob = await client.audit.export({
    format: "json",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  await writeFile("./audit-evidence.json", buffer);
  console.log(`wrote ${buffer.length} bytes to ./audit-evidence.json`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
