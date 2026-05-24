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
  /** `X-ClarisMD-Policy` header for this request. */
  clarismdPolicy?: string;
  /** `X-ClarisMD-PHI-Action` header for this request. */
  clarismdPhiAction?: "block" | "redact" | "tokenize" | "alert";
  /**
   * Idempotency key control:
   *   - `string` — sent verbatim
   *   - `false` — header omitted (use for non-idempotent flows)
   *   - omitted / `undefined` — auto-generated on POSTs
   */
  idempotencyKey?: string | false;
}

export function toRequestOptions(
  opts: ResourceRequestOptions | undefined,
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
