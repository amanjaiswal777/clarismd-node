// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".cjs" };
  },
  target: "es2022",
  platform: "neutral",
  dts: true,
  sourcemap: false,
  minify: true,
  treeshake: true,
  clean: true,
  splitting: false,
  shims: false,
});
