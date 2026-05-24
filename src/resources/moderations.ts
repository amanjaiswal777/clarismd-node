// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type {
  ModerationCreateParams,
  ModerationResponse,
} from "../types.js";
import { Resource, compact, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

export class ModerationsResource extends Resource {
  async create(
    params: ModerationCreateParams,
    options?: ResourceRequestOptions,
  ): Promise<ModerationResponse> {
    const body = compact({ ...params });
    return this.client.request<ModerationResponse>({
      method: "POST",
      path: "/moderations",
      body,
      options: toRequestOptions(options),
    });
  }
}
