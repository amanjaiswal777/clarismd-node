// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type { CompletionCreateParams, TextCompletion } from "../types.js";
import { Resource, compact, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

export class CompletionsResource extends Resource {
  async create(
    params: CompletionCreateParams,
    options?: ResourceRequestOptions,
  ): Promise<TextCompletion> {
    const body = compact({ ...params });
    return this.client.request<TextCompletion>({
      method: "POST",
      path: "/completions",
      body,
      options: toRequestOptions(options),
    });
  }
}
