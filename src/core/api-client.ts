// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  ClarisMDError,
  buildAPIError,
} from "./errors.js";
import { generateIdempotencyKey } from "./idempotency.js";
import {
  RETRY_BACKOFF_MS,
  isRetryableStatus,
  parseRetryAfter,
  retryDelayMs,
} from "./retry.js";

export const DEFAULT_BASE_URL = "https://api.clarismd.com/v1";
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_RETRIES = 2;

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Optional sleep injection point so retry tests don't burn wall-clock time.
 * Defaults to `setTimeout`; tests pass a no-op.
 */
export type SleepFn = (ms: number) => Promise<void>;

const defaultSleep: SleepFn = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface APIClientOptions {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultHeaders?: Record<string, string>;
  fetch?: FetchLike;
  sleep?: SleepFn;
  /**
   * Random source for jitter. Tests pin to a constant so backoff is
   * deterministic. Production omits → `Math.random`.
   */
  random?: () => number;
}

export interface RequestOptions {
  /**
   * Per-request timeout override (ms). Falls back to client-level
   * `timeout`.
   */
  timeout?: number;
  /**
   * Per-request max-retries override. `0` disables retries entirely
   * for this call.
   */
  maxRetries?: number;
  /**
   * Idempotency key.
   *   - `string` — sent verbatim
   *   - `false` — header omitted (use this for non-idempotent flows or
   *     when the caller is wrapping POSTs in their own dedupe layer)
   *   - omitted / `undefined` — auto-generated on POSTs only
   */
  idempotencyKey?: string | false;
  /** Extra headers merged on top of the per-request envelope. */
  headers?: Record<string, string>;
  /** Caller AbortSignal — composed with the timeout signal. */
  signal?: AbortSignal;
  /**
   * `X-ClarisMD-Policy` header — overrides the policy applied by the
   * gateway for this single request.
   */
  clarismdPolicy?: string;
  /**
   * `X-ClarisMD-PHI-Action` header — one of `block`, `redact`,
   * `tokenize`, `alert`.
   */
  clarismdPhiAction?: "block" | "redact" | "tokenize" | "alert";
}

export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestInput {
  method: RequestMethod;
  path: string;
  body?: unknown;
  query?: Record<string, unknown>;
  options?: RequestOptions;
  /**
   * When true, returns the raw `Response` instead of parsing JSON.
   * Used by streaming + audit-export paths.
   */
  rawResponse?: boolean;
}

function joinPath(base: string, path: string): string {
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

function appendQuery(url: string, query?: Record<string, unknown>): string {
  if (!query) return url;
  const search = new URLSearchParams();
  let any = false;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        search.append(key, String(item));
        any = true;
      }
    } else if (value instanceof Date) {
      search.append(key, value.toISOString());
      any = true;
    } else {
      search.append(key, String(value));
      any = true;
    }
  }
  if (!any) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${search.toString()}`;
}

function readRequestId(response: Response): string | null {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("X-Request-ID") ??
    null
  );
}

/**
 * Compose a caller-provided AbortSignal with one we create for the
 * request timeout. Uses `AbortSignal.any()` when available (Node 20.3+,
 * modern browsers, Workers since late 2024); otherwise listens on each
 * source signal and forwards aborts to a single shared controller.
 */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  const filtered = signals.filter((s) => s !== undefined);
  if (filtered.length === 0) return new AbortController().signal;
  if (filtered.length === 1) return filtered[0]!;

  const abortAny = (
    AbortSignal as typeof AbortSignal & {
      any?: (signals: AbortSignal[]) => AbortSignal;
    }
  ).any;
  if (typeof abortAny === "function") {
    return abortAny.call(AbortSignal, filtered);
  }

  const controller = new AbortController();
  for (const sig of filtered) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      break;
    }
    sig.addEventListener("abort", () => controller.abort(sig.reason), {
      once: true,
    });
  }
  return controller.signal;
}

async function readBodyText(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    return text.length === 0 ? null : text;
  } catch {
    return null;
  }
}

function safeJSONParse(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class APIClient {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly defaultHeaders: Record<string, string>;
  private readonly fetchImpl: FetchLike;
  private readonly sleep: SleepFn;
  private readonly random: () => number;

  constructor(options: APIClientOptions) {
    if (!options.apiKey) {
      throw new ClarisMDError(
        "ClarisMD: missing API key. Pass `apiKey` to the constructor or set CLARISMD_API_KEY.",
      );
    }
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL ?? DEFAULT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.defaultHeaders = { ...(options.defaultHeaders ?? {}) };

    const fetchRef =
      options.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (!fetchRef) {
      throw new ClarisMDError(
        "ClarisMD: no `fetch` available in this runtime. Pass `fetch` explicitly.",
      );
    }
    // Bind to globalThis when using the ambient fetch — some runtimes
    // (older Node, certain bundlers) require it.
    this.fetchImpl = options.fetch ?? ((input, init) => fetchRef(input, init));
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  private buildHeaders(
    method: RequestMethod,
    options: RequestOptions | undefined,
    hasJSONBody: boolean,
  ): Headers {
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    headers.set("Accept", "application/json");
    if (hasJSONBody) headers.set("Content-Type", "application/json");
    headers.set("User-Agent", "clarismd-ts/0.1.0");

    for (const [key, value] of Object.entries(this.defaultHeaders)) {
      headers.set(key, value);
    }

    if (method === "POST") {
      const idem = options?.idempotencyKey;
      if (idem === false) {
        // explicitly disabled
      } else if (typeof idem === "string") {
        headers.set("Idempotency-Key", idem);
      } else {
        headers.set("Idempotency-Key", generateIdempotencyKey());
      }
    }

    if (options?.clarismdPolicy) {
      headers.set("X-ClarisMD-Policy", options.clarismdPolicy);
    }
    if (options?.clarismdPhiAction) {
      headers.set("X-ClarisMD-PHI-Action", options.clarismdPhiAction);
    }

    if (options?.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers.set(key, value);
      }
    }

    return headers;
  }

  async request<T = unknown>(input: RequestInput): Promise<T> {
    const { method, path, body, query, options, rawResponse } = input;
    const url = appendQuery(joinPath(this.baseURL, path), query);

    const hasJSONBody = body !== undefined && body !== null;
    const serializedBody = hasJSONBody ? JSON.stringify(body) : undefined;
    const headers = this.buildHeaders(method, options, hasJSONBody);

    const maxRetries = options?.maxRetries ?? this.maxRetries;
    const timeoutMs = options?.timeout ?? this.timeout;

    let attempt = 0;
    let lastError: unknown = null;

    // First try is attempt 0; up to maxRetries additional attempts.
    while (attempt <= maxRetries) {
      const timeoutController = new AbortController();
      const timeoutHandle = setTimeout(
        () => timeoutController.abort(new Error("timeout")),
        timeoutMs,
      );
      const composedSignal = combineSignals(
        options?.signal
          ? [options.signal, timeoutController.signal]
          : [timeoutController.signal],
      );

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method,
          headers,
          body: serializedBody,
          signal: composedSignal,
        });
      } catch (err: unknown) {
        clearTimeout(timeoutHandle);
        // AbortError covers both caller-cancellation and timeout.
        const isAbort =
          err instanceof Error &&
          (err.name === "AbortError" || err.name === "TimeoutError");
        if (isAbort) {
          if (timeoutController.signal.aborted) {
            lastError = new APITimeoutError(
              `Request to ${url} timed out after ${timeoutMs}ms`,
              { cause: err },
            );
          } else {
            // Caller cancelled — surface as APIConnectionError but DO NOT retry.
            throw new APIConnectionError(`Request aborted: ${err.message}`, {
              cause: err,
            });
          }
        } else {
          // fetch throws TypeError on network failures across runtimes.
          lastError = new APIConnectionError(
            err instanceof Error ? err.message : String(err),
            { cause: err instanceof Error ? err : undefined },
          );
        }

        if (attempt < maxRetries) {
          const delay = retryDelayMs(attempt, null, this.random);
          await this.sleep(delay);
          attempt += 1;
          continue;
        }
        throw lastError;
      }
      clearTimeout(timeoutHandle);

      if (response.ok) {
        if (rawResponse) {
          return response as unknown as T;
        }
        if (response.status === 204) {
          return undefined as T;
        }
        const text = await readBodyText(response);
        const parsed = safeJSONParse(text);
        return parsed as T;
      }

      // Non-2xx — drain body for typed error.
      const requestId = readRequestId(response);
      const text = await readBodyText(response);
      const parsedBody = safeJSONParse(text);
      const apiErr = buildAPIError({
        statusCode: response.status,
        requestId,
        body: parsedBody ?? text,
      });

      if (
        attempt < maxRetries &&
        isRetryableStatus(response.status) &&
        !(apiErr instanceof APIError && apiErr.statusCode === 0)
      ) {
        const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
        const delay = retryDelayMs(attempt, retryAfter, this.random);
        await this.sleep(delay);
        attempt += 1;
        lastError = apiErr;
        continue;
      }

      throw apiErr;
    }

    // Unreachable in practice — the loop either returns or throws.
    throw lastError ?? new ClarisMDError("retry loop exited unexpectedly");
  }
}

// Re-export the constants helper for tests / advanced consumers.
export { RETRY_BACKOFF_MS };
