// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { ClarisMDError } from "../core/errors.js";
import type { APIKey, KeyCreateParams } from "../types.js";
import { Resource, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The gateway returns a bare array / bare object (no `{data: ...}` envelope).
function asList(raw: unknown): APIKey[] {
  if (Array.isArray(raw)) return raw as APIKey[];
  throw new ClarisMDError("Unexpected key list response shape from gateway.");
}

function asKey(raw: unknown): APIKey {
  if (isPlainObject(raw)) return raw as APIKey;
  throw new ClarisMDError("Unexpected key response shape from gateway.");
}

export class KeysResource extends Resource {
  async list(options?: ResourceRequestOptions): Promise<APIKey[]> {
    const raw = await this.client.request<unknown>({
      method: "GET",
      path: "/keys",
      options: toRequestOptions(options),
    });
    return asList(raw);
  }

  /**
   * Create an API key. The full secret is returned **once**, in `key` —
   * store it immediately. Subsequent `get()` / `list()` calls return
   * metadata only (`key_prefix`).
   */
  async create(
    params: KeyCreateParams = {},
    options?: ResourceRequestOptions,
  ): Promise<APIKey> {
    const body: Record<string, unknown> = {};
    if (params.name !== undefined) body["name"] = params.name;
    if (params.permissions !== undefined)
      body["permissions"] = params.permissions;
    if (params.expiresInDays !== undefined)
      body["expires_in_days"] = params.expiresInDays;
    const raw = await this.client.request<unknown>({
      method: "POST",
      path: "/keys",
      body,
      options: toRequestOptions(options),
    });
    return asKey(raw);
  }

  async get(keyId: string, options?: ResourceRequestOptions): Promise<APIKey> {
    const raw = await this.client.request<unknown>({
      method: "GET",
      path: `/keys/${encodeURIComponent(keyId)}`,
      options: toRequestOptions(options),
    });
    return asKey(raw);
  }

  async delete(keyId: string, options?: ResourceRequestOptions): Promise<void> {
    await this.client.request<unknown>({
      method: "DELETE",
      path: `/keys/${encodeURIComponent(keyId)}`,
      options: toRequestOptions(options),
    });
  }
}
