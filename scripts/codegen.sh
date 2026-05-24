#!/usr/bin/env bash
# Copyright (c) 2026 ClarisMD contributors.
# SPDX-License-Identifier: Apache-2.0
#
# Regenerate src/types.generated.ts from the v1 OpenAPI spec.
#
# Usage:
#   bash scripts/codegen.sh                                # default spec
#   bash scripts/codegen.sh ../packages/openapi/v1.yaml    # override path

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_SPEC="$ROOT_DIR/../packages/openapi/v1.yaml"

SPEC="${1:-$DEFAULT_SPEC}"
OUT="$ROOT_DIR/src/types.generated.ts"

if [ ! -f "$SPEC" ]; then
  echo "ERROR: OpenAPI spec not found at $SPEC" >&2
  echo "Pass an explicit path: bash scripts/codegen.sh /path/to/v1.yaml" >&2
  exit 1
fi

echo "regenerating $OUT from $SPEC"

# openapi-typescript is pinned to >=7,<8 in package.json — see plan 17.
npx --yes openapi-typescript "$SPEC" \
  --output "$OUT" \
  --immutable \
  --root-types \
  --enum

# Stamp the file so reviewers know it's autogen.
{
  echo "// Copyright (c) 2026 ClarisMD contributors."
  echo "// SPDX-License-Identifier: Apache-2.0"
  echo "/* eslint-disable */"
  echo "// AUTO-GENERATED — do not edit by hand."
  echo "// Regenerate with: npm run codegen"
  cat "$OUT"
} > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"

echo "done."
