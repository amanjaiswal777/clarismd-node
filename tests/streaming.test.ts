// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  InternalServerError,
  PHIPolicyViolationError,
  Stream,
} from "../src/index.js";
import type { ChatCompletionChunk } from "../src/index.js";
import type { FetchLike } from "../src/core/api-client.js";
import { makeClient, streamingResponse } from "./_helpers.js";

function chunk(content: string, finishReason: string | null = null): string {
  const obj = {
    id: "chunk_1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        delta: { content },
        finish_reason: finishReason,
      },
    ],
  };
  return `data: ${JSON.stringify(obj)}\n\n`;
}

describe("streaming chat completions", () => {
  it("yields chunks until [DONE]", async () => {
    const fetch: FetchLike = async () =>
      streamingResponse([chunk("Hel"), chunk("lo", "stop"), "data: [DONE]\n\n"]);
    const client = makeClient(fetch);
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    });
    expect(stream).toBeInstanceOf(Stream);
    const collected: ChatCompletionChunk[] = [];
    for await (const ev of stream) {
      collected.push(ev);
    }
    expect(collected).toHaveLength(2);
    expect(collected[0]!.choices[0]!.delta.content).toBe("Hel");
    expect(collected[1]!.choices[0]!.finish_reason).toBe("stop");
  });

  it("tolerates SSE comments and blank lines", async () => {
    const fetch: FetchLike = async () =>
      streamingResponse([
        ": comment line\n\n",
        chunk("ok", "stop"),
        "data: [DONE]\n\n",
      ]);
    const client = makeClient(fetch);
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    });
    const events: ChatCompletionChunk[] = [];
    for await (const ev of stream) events.push(ev);
    expect(events).toHaveLength(1);
  });

  it("raises typed APIError on mid-stream error envelope", async () => {
    const fetch: FetchLike = async () =>
      streamingResponse([
        chunk("partial"),
        `data: ${JSON.stringify({
          error: {
            type: "phi_policy_violation",
            message: "PHI detected",
            code: "phi_blocked",
          },
        })}\n\n`,
      ]);
    const client = makeClient(fetch);
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "x" }],
      stream: true,
    });
    await expect(
      (async () => {
        for await (const _ of stream) {
          // drain
        }
      })(),
    ).rejects.toBeInstanceOf(PHIPolicyViolationError);
  });

  it("falls back to status-based error class when type is unknown", async () => {
    const fetch: FetchLike = async () =>
      streamingResponse([
        chunk("partial"),
        `data: ${JSON.stringify({
          error: { type: "internal_server_error", message: "boom" },
        })}\n\n`,
      ]);
    const client = makeClient(fetch);
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "x" }],
      stream: true,
    });
    await expect(
      (async () => {
        for await (const _ of stream) {
          /* drain */
        }
      })(),
    ).rejects.toBeInstanceOf(InternalServerError);
  });

  it("close() is idempotent", async () => {
    const fetch: FetchLike = async () => streamingResponse(["data: [DONE]\n\n"]);
    const client = makeClient(fetch);
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "x" }],
      stream: true,
    });
    await stream.close();
    await stream.close();
  });
});
