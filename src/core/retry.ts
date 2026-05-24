// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Retry policy: 429 / 5xx / network failures retried with exponential
 * backoff (500ms, 1s, 2s) plus ±25% jitter; `Retry-After` honored and
 * capped at 60 s. 4xx other than 429 is never retried — those are
 * deterministic and a retry would just repeat the same failure.
 */

export const RETRYABLE_STATUS: ReadonlySet<number> = new Set([
  429, 500, 502, 503, 504,
]);

export const RETRY_BACKOFF_MS: readonly number[] = [500, 1000, 2000];
export const RETRY_AFTER_CAP_MS = 60_000;

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

/**
 * Parse a `Retry-After` header. Accepts either an integer (seconds) or
 * an HTTP-date per RFC 7231. Returns milliseconds, or `null` when the
 * header is missing or unparseable.
 */
export function parseRetryAfter(
  header: string | null | undefined,
): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed === "") return null;

  // Plain seconds first — fastest path and what gateways usually send.
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    return Number.isFinite(seconds) ? seconds * 1000 : null;
  }

  // HTTP-date fallback.
  const dateMs = Date.parse(trimmed);
  if (!Number.isFinite(dateMs)) return null;
  const delta = dateMs - Date.now();
  return delta > 0 ? delta : 0;
}

/**
 * Compute the delay before the next retry, with ±25% jitter. The
 * `attempt` argument is 0-indexed (first retry uses `RETRY_BACKOFF_MS[0]`).
 *
 * `Retry-After` (in ms) overrides the backoff schedule when present, but
 * is always clamped at `RETRY_AFTER_CAP_MS` so a misbehaving server can't
 * make us wait an hour.
 */
export function retryDelayMs(
  attempt: number,
  retryAfterMs: number | null,
  randomFn: () => number = Math.random,
): number {
  const base =
    retryAfterMs !== null
      ? Math.min(retryAfterMs, RETRY_AFTER_CAP_MS)
      : (RETRY_BACKOFF_MS[Math.min(attempt, RETRY_BACKOFF_MS.length - 1)] ??
        2000);
  const jitter = (randomFn() * 0.5 - 0.25) * base; // ±25%
  return Math.max(0, Math.round(base + jitter));
}
