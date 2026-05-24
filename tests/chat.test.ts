// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { APIConnectionError, NotFoundError } from "../src/index.js";
import { makeClient, mockFetch } from "./_helpers.js";

const COMPLETION_BODY = {
  id: "cmpl_test",
  object: "chat.completion",
  created: 1700000000,
  model: "gpt-4o-mini",
  choices: [
    {
      index: 0,
      message: { role: "assistant", content: "Hello" },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
};

describe("chat.completions.create", () => {
  it("posts JSON to /chat/completions and returns parsed body", async () => {
    const m = mockFetch([{ body: COMPLETION_BODY }]);
    const client = makeClient(m.fetch);
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.id).toBe("cmpl_test");
    const req = m.requests[0]!;
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://api.test.local/v1/chat/completions");
    const parsed = JSON.parse(req.body!);
    expect(parsed.model).toBe("gpt-4o-mini");
  });

  it("attaches Authorization, Idempotency-Key, and User-Agent headers", async () => {
    const m = mockFetch([{ body: COMPLETION_BODY }]);
    const client = makeClient(m.fetch);
    await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    });
    const headers = m.requests[0]!.headers;
    expect(headers["authorization"]).toBe("Bearer sk-test");
    expect(headers["content-type"]).toContain("application/json");
    expect(headers["user-agent"]).toMatch(/^clarismd-ts\/\d/);
    expect(headers["idempotency-key"]).toMatch(/^cmd-ts-/);
  });

  it("respects clarismdPolicy / clarismdPhiAction options", async () => {
    const m = mockFetch([{ body: COMPLETION_BODY }]);
    const client = makeClient(m.fetch);
    await client.chat.completions.create(
      { model: "gpt-4o-mini", messages: [{ role: "user", content: "x" }] },
      { clarismdPolicy: "strict", clarismdPhiAction: "redact" },
    );
    const headers = m.requests[0]!.headers;
    expect(headers["x-clarismd-policy"]).toBe("strict");
    expect(headers["x-clarismd-phi-action"]).toBe("redact");
  });

  it("uses an explicit idempotency key when provided", async () => {
    const m = mockFetch([{ body: COMPLETION_BODY }]);
    const client = makeClient(m.fetch);
    await client.chat.completions.create(
      { model: "gpt-4o-mini", messages: [{ role: "user", content: "x" }] },
      { idempotencyKey: "abc-123" },
    );
    expect(m.requests[0]!.headers["idempotency-key"]).toBe("abc-123");
  });

  it("omits the Idempotency-Key header when set to false", async () => {
    const m = mockFetch([{ body: COMPLETION_BODY }]);
    const client = makeClient(m.fetch);
    await client.chat.completions.create(
      { model: "gpt-4o-mini", messages: [{ role: "user", content: "x" }] },
      { idempotencyKey: false },
    );
    expect(m.requests[0]!.headers["idempotency-key"]).toBeUndefined();
  });

  it("honors a custom baseURL", async () => {
    const m = mockFetch([{ body: COMPLETION_BODY }]);
    const client = makeClient(m.fetch, { baseURL: "https://gateway.example.org/api" });
    await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "x" }],
    });
    expect(m.requests[0]!.url).toBe(
      "https://gateway.example.org/api/chat/completions",
    );
  });

  it("surfaces error.type via the matching APIError subclass", async () => {
    const m = mockFetch([
      {
        status: 404,
        body: {
          error: {
            type: "not_found",
            message: "model_unavailable",
            code: "model_not_found",
          },
        },
        headers: { "x-request-id": "req_abc" },
      },
    ]);
    const client = makeClient(m.fetch, { maxRetries: 0 });
    await expect(
      client.chat.completions.create({
        model: "missing",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toMatchObject({
      name: "NotFoundError",
      statusCode: 404,
      requestId: "req_abc",
      code: "model_not_found",
    });
  });

  it("wraps fetch network failures as APIConnectionError", async () => {
    const failing = async () => {
      throw new TypeError("Failed to fetch");
    };
    const client = makeClient(failing as never, { maxRetries: 0 });
    await expect(
      client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toBeInstanceOf(APIConnectionError);
  });

  it("returns the typed error class even when only the status fallback applies", async () => {
    const m = mockFetch([{ status: 404, body: { error: { message: "gone" } } }]);
    const client = makeClient(m.fetch, { maxRetries: 0 });
    await expect(
      client.chat.completions.create({
        model: "missing",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
