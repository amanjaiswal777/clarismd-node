// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Cloudflare Worker that proxies chat requests through the ClarisMD
 * gateway. Deploy with `wrangler deploy`.
 *
 * Set the gateway key as a Worker secret:
 *
 *   wrangler secret put CLARISMD_API_KEY
 *
 * The handler exposes POST /chat that accepts `{ messages, model? }`
 * and returns the gateway's chat completion verbatim.
 */

import { ClarisMD } from "../src/index.js";

interface Env {
  CLARISMD_API_KEY: string;
  CLARISMD_BASE_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (
      request.method !== "POST" ||
      new URL(request.url).pathname !== "/chat"
    ) {
      return new Response("Not Found", { status: 404 });
    }

    const payload = (await request.json()) as {
      model?: string;
      messages: Array<{ role: string; content: string }>;
    };

    const client = new ClarisMD({
      apiKey: env.CLARISMD_API_KEY,
      baseURL: env.CLARISMD_BASE_URL,
    });

    const completion = await client.chat.completions.create({
      model: payload.model ?? "gpt-4o-mini",
      messages: payload.messages,
    });

    return new Response(JSON.stringify(completion), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
};
