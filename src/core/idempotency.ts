// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Generate a fresh `Idempotency-Key` for the next POST. Keys are
 * 24-hour-scoped on the server side (per `17-v1-api-contract.md`), so a
 * UUID is overkill cryptographically but trivial to produce on every
 * runtime we target.
 *
 * `globalThis.crypto.randomUUID()` is available on:
 *   - Node 18.4+ (and 19+ uniformly)
 *   - All evergreen browsers
 *   - Cloudflare Workers
 *   - Deno
 *   - Bun
 *
 * For the narrow window of Node 18.0 – 18.3 we fall back to a v4-shaped
 * `Math.random()` UUID. Idempotency keys don't need crypto strength;
 * they need uniqueness across a single client's concurrent requests.
 */

export const IDEMPOTENCY_KEY_PREFIX = "cmd-ts";

function v4Fallback(): string {
  // RFC 4122 v4 layout. NOT cryptographically strong — used only when
  // crypto.randomUUID is unavailable.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateUUID(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return v4Fallback();
}

export function generateIdempotencyKey(): string {
  return `${IDEMPOTENCY_KEY_PREFIX}-${generateUUID()}`;
}
