// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type { EmbeddingCreateParams, EmbeddingResponse } from "../types.js";
import { Resource, compact, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

export class EmbeddingsResource extends Resource {
  async create(
    params: EmbeddingCreateParams,
    options?: ResourceRequestOptions,
  ): Promise<EmbeddingResponse> {
    const body = compact({ ...params });
    return this.client.request<EmbeddingResponse>({
      method: "POST",
      path: "/embeddings",
      body,
      options: toRequestOptions(options),
    });
  }
}
