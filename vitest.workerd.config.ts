// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0
//
// Cloudflare Worker compatibility smoke test config. Runs ONLY
// tests/worker-compat.test.ts under the workerd pool to confirm the SDK
// imports cleanly without pulling any Node-only API into the critical path.
//
// The pool itself (@cloudflare/vitest-pool-workers) is not pinned in
// devDependencies — CI installs it separately so a missing local install
// doesn't block local development. See .github/workflows/typescript-sdk-ci.yml.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/worker-compat.test.ts"],
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityDate: "2024-12-01",
          compatibilityFlags: ["nodejs_compat"],
        },
      },
    },
    pool: "@cloudflare/vitest-pool-workers",
  },
});
