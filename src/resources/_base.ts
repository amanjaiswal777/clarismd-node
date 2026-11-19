// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type { APIClient, RequestOptions } from "../core/api-client.js";

/**
 * Common per-request "extras" exposed on every resource method.
 * Using a single helper keeps every resource signature shaped the same
 * as the Python SDK's `clarismd_*` keyword args.
 */
export interface ResourceRequestOptions {
  /** Request timeout (ms) — overrides the client default. */
  timeout?: number;
  /** Per-request maxRetries override. `0` disables retries. */
  maxRetries?: number;
  /** Caller-provided AbortSignal — composed with the timeout signal. */
  signal?: AbortSignal;
  /** Extra headers merged on top of the request envelope. */
  headers?: Record<string, string>;
  /**
   * Idempotency key control:
   *   - `string` — sent verbatim
   *   - `false` — header omitted (use for non-idempotent flows)
   *   - omitted / `undefined` — auto-generated on POSTs
   */
  idempotencyKey?: string | false;
}

/**
 * Options for the governed model calls: `chat.completions.create` and
 * `completions.create`. The gateway applies these per request; other
 * endpoints do not accept them.
 *
 * Both are **tighten-only**: they can make the gateway stricter than your
 * organisation's settings for this call, never looser. An invalid value is
 * rejected with a 422 (`UnprocessableEntityError`) rather than ignored.
 */
export interface GovernedRequestOptions extends ResourceRequestOptions {
  /**
   * `X-ClarisMD-Policy`: the id of one of your own active security policies.
   * Its action is applied to the threat types it covers, on top of your
   * settings (it can add masking or blocking, not remove them). Another
   * user's, an inactive or an unknown policy id is a 422.
   */
  clarismdPolicy?: string;
  /**
   * `X-ClarisMD-PHI-Action`: how to treat PHI in this request, if stricter
   * than your settings. Strictness: `block` > `redact` (= `tokenize`) > `alert`.
   *   - `block`    — PHI in the input refuses the request before the provider
   *                  is called (`PHIPolicyViolationError`).
   *   - `redact` / `tokenize` — PHI is tokenized for the provider and restored
   *                  in the response, even if your settings only log it.
   *   - `alert`    — never loosens: if your settings redact, PHI is redacted.
   * The response header `X-ClarisMD-PHI-Action-Applied` reports what actually
   * happened (`redact`, `alert`, or `none` when no PHI was found).
   */
  clarismdPhiAction?: "block" | "redact" | "tokenize" | "alert";
}

export function toRequestOptions(
  opts: GovernedRequestOptions | undefined,
): RequestOptions {
  if (!opts) return {};
  const out: RequestOptions = {};
  if (opts.timeout !== undefined) out.timeout = opts.timeout;
  if (opts.maxRetries !== undefined) out.maxRetries = opts.maxRetries;
  if (opts.signal !== undefined) out.signal = opts.signal;
  if (opts.headers !== undefined) out.headers = opts.headers;
  if (opts.clarismdPolicy !== undefined)
    out.clarismdPolicy = opts.clarismdPolicy;
  if (opts.clarismdPhiAction !== undefined)
    out.clarismdPhiAction = opts.clarismdPhiAction;
  if (opts.idempotencyKey !== undefined)
    out.idempotencyKey = opts.idempotencyKey;
  return out;
}

/**
 * Strip undefined entries from a body so the wire payload doesn't carry
 * `"foo": undefined` (which JSON.stringify would drop anyway, but doing
 * it here keeps tests readable).
 */
export function compact<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

export abstract class Resource {
  protected readonly client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }
}
