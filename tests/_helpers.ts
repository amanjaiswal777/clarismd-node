// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { ClarisMD } from "../src/index.js";
import type { ClarisMDOptions } from "../src/index.js";
import type { FetchLike } from "../src/core/api-client.js";

export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  signal: AbortSignal | null;
}

export interface MockResponseSpec {
  status?: number;
  body?: unknown;
  /** Pre-serialized text body (skips JSON.stringify on `body`). */
  text?: string;
  headers?: Record<string, string>;
}

export interface MockFetchHandle {
  fetch: FetchLike;
  requests: CapturedRequest[];
  /** Number of fetches issued so far. */
  callCount: () => number;
}

/**
 * Build a stub fetch that returns each spec in order. If `specs` is a
 * function, it's invoked per call and may inspect the captured request.
 */
export function mockFetch(
  specs: MockResponseSpec[] | ((req: CapturedRequest) => MockResponseSpec),
): MockFetchHandle {
  const requests: CapturedRequest[] = [];
  let i = 0;
  const fetch: FetchLike = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    const headerSource = new Headers(init?.headers);
    headerSource.forEach((value, key) => {
      headers[key] = value;
    });
    const body =
      typeof init?.body === "string"
        ? init.body
        : init?.body === undefined
          ? null
          : String(init.body);
    const captured: CapturedRequest = {
      url,
      method,
      headers,
      body,
      signal: init?.signal ?? null,
    };
    requests.push(captured);

    const spec =
      typeof specs === "function"
        ? specs(captured)
        : (specs[i] ?? specs[specs.length - 1] ?? { status: 200, body: {} });
    i += 1;

    const status = spec.status ?? 200;
    const text =
      spec.text !== undefined
        ? spec.text
        : spec.body === undefined
          ? ""
          : typeof spec.body === "string"
            ? spec.body
            : JSON.stringify(spec.body);
    const responseHeaders = new Headers(spec.headers ?? {});
    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "application/json");
    }
    // Status codes 204/205/304 forbid a body per the HTTP spec, and
    // `new Response("", { status: 204 })` throws in some runtimes.
    const responseBody =
      status === 204 || status === 205 || status === 304 ? null : text;
    return new Response(responseBody, { status, headers: responseHeaders });
  };

  return { fetch, requests, callCount: () => requests.length };
}

export function makeClient(
  fetch: FetchLike,
  overrides: Partial<ClarisMDOptions> = {},
): ClarisMD {
  return new ClarisMD({
    apiKey: "sk-test",
    baseURL: "https://api.test.local/v1",
    fetch,
    ...overrides,
  });
}

/**
 * Build a streaming Response whose body emits each chunk separately.
 * Mirrors what an SSE gateway produces.
 */
export function streamingResponse(
  chunks: string[],
  init: ResponseInit = {},
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/event-stream");
  }
  return new Response(stream, { ...init, headers });
}
