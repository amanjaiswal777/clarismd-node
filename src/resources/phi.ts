// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type { PHIScanResult } from "../types.js";
import { Resource, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

export interface PHIScanOptions extends ResourceRequestOptions {
  /** When true, request the full entity list. Default true on the server. */
  returnEntities?: boolean;
}

export class PHIResource extends Resource {
  /**
   * Scan one string or a batch for PHI. The input is sent over the wire
   * — only call this on text the caller is permitted to transmit.
   */
  async scan(
    text: string | string[],
    options?: PHIScanOptions,
  ): Promise<PHIScanResult> {
    const body: Record<string, unknown> = { text };
    if (options?.returnEntities !== undefined) {
      body["return_entities"] = options.returnEntities;
    }
    return this.client.request<PHIScanResult>({
      method: "POST",
      path: "/phi/scan",
      body,
      options: toRequestOptions(options),
    });
  }
}
