// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type { HealthStatus } from "../types.js";
import { Resource, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

export class HealthResource extends Resource {
  /**
   * Liveness probe for the gateway. Returns the running version and
   * an `ok` status when reachable. The endpoint does not require a
   * valid API key on the server side, but the SDK still attaches the
   * configured Authorization header — the gateway ignores it here.
   */
  async check(options?: ResourceRequestOptions): Promise<HealthStatus> {
    return this.client.request<HealthStatus>({
      method: "GET",
      path: "/health",
      options: toRequestOptions(options),
    });
  }
}
