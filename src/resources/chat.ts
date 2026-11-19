// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type { APIClient } from "../core/api-client.js";
import { Stream } from "../core/streaming.js";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "../types.js";
import { Resource, compact, toRequestOptions } from "./_base.js";
import type { GovernedRequestOptions } from "./_base.js";

export class ChatCompletionsResource extends Resource {
  create(
    params: ChatCompletionCreateParamsNonStreaming,
    options?: GovernedRequestOptions,
  ): Promise<ChatCompletion>;
  create(
    params: ChatCompletionCreateParamsStreaming,
    options?: GovernedRequestOptions,
  ): Promise<Stream<ChatCompletionChunk>>;
  async create(
    params: ChatCompletionCreateParams,
    options?: GovernedRequestOptions,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
    const body = compact({ ...params });
    const reqOpts = toRequestOptions(options);

    if (params.stream === true) {
      const response = await this.client.request<Response>({
        method: "POST",
        path: "/chat/completions",
        body,
        options: reqOpts,
        rawResponse: true,
      });
      return new Stream<ChatCompletionChunk>(response);
    }

    return this.client.request<ChatCompletion>({
      method: "POST",
      path: "/chat/completions",
      body,
      options: reqOpts,
    });
  }
}

export class ChatResource extends Resource {
  readonly completions: ChatCompletionsResource;

  constructor(client: APIClient) {
    super(client);
    this.completions = new ChatCompletionsResource(client);
  }
}
