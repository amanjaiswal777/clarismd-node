// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type { PHIScanResponse } from "../types.js";
import { Resource, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

export interface PHIScanOptions extends ResourceRequestOptions {
  /** Detector types to run. Defaults to the PHI/PII detectors. */
  scanTypes?: string[];
  /** Use the ML-backed detector path. Default false. */
  useMl?: boolean;
}

export class PHIResource extends Resource {
  /**
   * Scan one string or a batch for PHI. Returns one result per input, in
   * order (`response.results[0]` for a single string). The input is sent
   * over the wire — only call this on text the caller is permitted to
   * transmit.
   */
  async scan(
    text: string | string[],
    options?: PHIScanOptions,
  ): Promise<PHIScanResponse> {
    const body: Record<string, unknown> = { text };
    if (options?.scanTypes !== undefined)
      body["scan_types"] = options.scanTypes;
    if (options?.useMl !== undefined) body["use_ml"] = options.useMl;
    return this.client.request<PHIScanResponse>({
      method: "POST",
      path: "/phi/scan",
      body,
      options: toRequestOptions(options),
    });
  }
}
