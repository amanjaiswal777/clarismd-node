// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { ClarisMDError } from "../core/errors.js";
import type { APIKey, KeyCreateParams } from "../types.js";
import { Resource, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapList(raw: unknown): APIKey[] {
  if (Array.isArray(raw)) return raw as APIKey[];
  if (isPlainObject(raw) && Array.isArray(raw["data"])) {
    return raw["data"] as APIKey[];
  }
  return [];
}

function unwrapKey(raw: unknown): APIKey {
  if (isPlainObject(raw)) {
    if (isPlainObject(raw["data"])) return raw["data"] as APIKey;
    return raw as APIKey;
  }
  throw new ClarisMDError("Unexpected key response shape from gateway.");
}

export class KeysResource extends Resource {
  async list(options?: ResourceRequestOptions): Promise<APIKey[]> {
    const raw = await this.client.request<unknown>({
      method: "GET",
      path: "/keys",
      options: toRequestOptions(options),
    });
    return unwrapList(raw);
  }

  /**
   * Create an API key. The full `secret` is returned **once** — store it
   * immediately. Subsequent `get()` calls return metadata only.
   */
  async create(
    params: KeyCreateParams,
    options?: ResourceRequestOptions,
  ): Promise<APIKey> {
    const body: Record<string, unknown> = { name: params.name };
    if (params.scopes !== undefined) body["scopes"] = params.scopes;
    const raw = await this.client.request<unknown>({
      method: "POST",
      path: "/keys",
      body,
      options: toRequestOptions(options),
    });
    return unwrapKey(raw);
  }

  async get(keyId: string, options?: ResourceRequestOptions): Promise<APIKey> {
    const raw = await this.client.request<unknown>({
      method: "GET",
      path: `/keys/${encodeURIComponent(keyId)}`,
      options: toRequestOptions(options),
    });
    return unwrapKey(raw);
  }

  async delete(keyId: string, options?: ResourceRequestOptions): Promise<void> {
    await this.client.request<unknown>({
      method: "DELETE",
      path: `/keys/${encodeURIComponent(keyId)}`,
      options: toRequestOptions(options),
    });
  }
}
