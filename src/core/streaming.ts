// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { APIError, ClarisMDError, buildAPIError } from "./errors.js";

/**
 * Server-Sent Events parser for ClarisMD streaming endpoints.
 *
 * The gateway emits one SSE event per chunk:
 *
 *   data: {"id":"...","choices":[{"delta":{"content":"Hello"}}]}
 *
 *   data: [DONE]
 *
 * Mid-stream errors arrive as a regular `data:` frame with an `error`
 * envelope matching the v1 contract — we surface them as the same typed
 * exception classes that synchronous calls raise, so callers can `catch`
 * uniformly.
 */

const DONE_SENTINEL = "[DONE]";

function readRequestId(response: Response): string | null {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("X-Request-ID") ??
    null
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Wrapper around a streaming `Response` that exposes the chunks as an
 * `AsyncIterable<T>`.
 *
 * Usage:
 *
 *   const stream = await client.chat.completions.create({ stream: true, ... });
 *   for await (const chunk of stream) {
 *     process(chunk);
 *   }
 *
 * The reader is cancelled automatically when iteration completes,
 * throws, or `close()` is called explicitly.
 */
export class Stream<T> implements AsyncIterable<T> {
  private readonly response: Response;
  private readonly abortController: AbortController | null;
  private readonly requestId: string | null;
  private closed = false;

  constructor(response: Response, abortController?: AbortController) {
    this.response = response;
    this.abortController = abortController ?? null;
    this.requestId = readRequestId(response);
  }

  /** AbortController bound to this stream — useful for cancellation. */
  controller(): AbortController | null {
    return this.abortController;
  }

  /**
   * Cancel the underlying reader. Idempotent — safe to call multiple
   * times and after natural completion.
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.abortController && !this.abortController.signal.aborted) {
      this.abortController.abort();
    }
    try {
      await this.response.body?.cancel();
    } catch {
      // Already closed or cancellation race — ignore.
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    const body = this.response.body;
    if (!body) {
      throw new ClarisMDError("Streaming response has no body");
    }

    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Flush trailing partial line, if any.
          if (buffer.length > 0) {
            const final = this.parseEvent(buffer);
            if (final !== undefined) {
              if (final === DONE) return;
              yield final;
            }
          }
          return;
        }
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line. Tolerate \n\n, \r\n\r\n.
        let separatorIndex: number;
        while ((separatorIndex = findEventBoundary(buffer)) !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(
            separatorIndex + boundaryLength(buffer, separatorIndex),
          );
          const parsed = this.parseEvent(rawEvent);
          if (parsed === undefined) continue;
          if (parsed === DONE) return;
          yield parsed;
        }
      }
    } finally {
      this.closed = true;
      try {
        reader.releaseLock();
      } catch {
        // Reader may already be released by cancel().
      }
      try {
        await body.cancel();
      } catch {
        // Ignore — already cancelled.
      }
    }
  }

  /**
   * Parse a single SSE event block. Returns:
   *   - the typed payload `T`
   *   - the `DONE` sentinel if the event is `data: [DONE]`
   *   - `undefined` if the block has no actionable `data:` lines (e.g.
   *     comments-only or empty)
   *
   * Throws an `APIError` subclass if the payload contains an `error`
   * envelope.
   */
  private parseEvent(rawEvent: string): T | typeof DONE | undefined {
    const dataLines: string[] = [];
    for (const line of rawEvent.split(/\r?\n/)) {
      if (line.length === 0) continue;
      // Comments per the SSE spec start with `:`.
      if (line.startsWith(":")) continue;
      if (line.startsWith("data:")) {
        // The space after `data:` is optional per the spec.
        dataLines.push(line.slice(5).replace(/^ /, ""));
      }
      // Other fields (event:, id:, retry:) are intentionally ignored —
      // the v1 contract only uses `data:`.
    }
    if (dataLines.length === 0) return undefined;
    const dataStr = dataLines.join("\n");
    if (dataStr === DONE_SENTINEL) return DONE;

    let parsed: unknown;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      // Malformed frame — treat as transport error.
      throw new ClarisMDError(`Malformed SSE event: ${dataStr.slice(0, 200)}`);
    }

    if (isPlainObject(parsed) && isPlainObject(parsed["error"])) {
      // The gateway includes the request id in the error envelope or as
      // a header — prefer the envelope when present.
      throw buildAPIError({
        statusCode: this.response.status || 200,
        requestId: this.requestId,
        body: parsed,
      });
    }

    return parsed as T;
  }
}

const DONE = Symbol("STREAM_DONE");

/**
 * Find the index of the next event boundary (`\n\n` or `\r\n\r\n`) in
 * the buffer, or -1 if none is present.
 */
function findEventBoundary(buffer: string): number {
  const lf = buffer.indexOf("\n\n");
  const crlf = buffer.indexOf("\r\n\r\n");
  if (lf === -1) return crlf;
  if (crlf === -1) return lf;
  return Math.min(lf, crlf);
}

/**
 * Length of the boundary marker at the given index — 2 for `\n\n`,
 * 4 for `\r\n\r\n`.
 */
function boundaryLength(buffer: string, index: number): number {
  return buffer.startsWith("\r\n\r\n", index) ? 4 : 2;
}

// Re-export so callers `import { APIError } from ...` works for the
// streaming-error case without a separate import path.
export { APIError };
