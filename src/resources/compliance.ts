// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { ClarisMDError } from "../core/errors.js";
import type {
  ComplianceAcknowledgeParams,
  ComplianceRequirementsParams,
  ComplianceScore,
  ComplianceScoreParams,
  EvidenceArtifact,
  Requirement,
} from "../types.js";
import { Resource, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The `/compliance/requirements` and `/compliance/.../evidence` endpoints
 * sometimes return a paginated `{ data: [...] }` envelope and sometimes
 * a bare array. Normalize so callers always receive an array.
 */
function unwrapArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (isPlainObject(raw) && Array.isArray(raw["data"])) {
    return raw["data"] as T[];
  }
  return [];
}

function unwrapObject<T>(raw: unknown, label: string): T {
  if (isPlainObject(raw)) {
    if (isPlainObject(raw["data"])) return raw["data"] as T;
    return raw as T;
  }
  throw new ClarisMDError(`Unexpected ${label} response shape from gateway.`);
}

export class ComplianceResource extends Resource {
  async score(
    params: ComplianceScoreParams = {},
    options?: ResourceRequestOptions,
  ): Promise<ComplianceScore> {
    return this.client.request<ComplianceScore>({
      method: "GET",
      path: "/compliance/score",
      query: { framework: params.framework ?? "hipaa" },
      options: toRequestOptions(options),
    });
  }

  async requirements(
    params: ComplianceRequirementsParams = {},
    options?: ResourceRequestOptions,
  ): Promise<Requirement[]> {
    const query: Record<string, unknown> = {
      framework: params.framework ?? "hipaa",
    };
    if (params.status !== undefined) query["status"] = params.status;
    if (params.limit !== undefined) query["limit"] = params.limit;
    if (params.cursor !== undefined) query["cursor"] = params.cursor;
    const raw = await this.client.request<unknown>({
      method: "GET",
      path: "/compliance/requirements",
      query,
      options: toRequestOptions(options),
    });
    return unwrapArray<Requirement>(raw);
  }

  async evidence(
    requirementId: string,
    options?: ResourceRequestOptions,
  ): Promise<EvidenceArtifact[]> {
    const raw = await this.client.request<unknown>({
      method: "GET",
      path: `/compliance/requirements/${encodeURIComponent(
        requirementId,
      )}/evidence`,
      options: toRequestOptions(options),
    });
    return unwrapArray<EvidenceArtifact>(raw);
  }

  async acknowledge(
    requirementId: string,
    params: ComplianceAcknowledgeParams,
    options?: ResourceRequestOptions,
  ): Promise<Requirement> {
    const body: Record<string, unknown> = { status: params.status };
    if (params.notes !== undefined) body["notes"] = params.notes;
    if (params.policyUrl !== undefined) body["policy_url"] = params.policyUrl;
    const raw = await this.client.request<unknown>({
      method: "POST",
      path: `/compliance/requirements/${encodeURIComponent(
        requirementId,
      )}/acknowledge`,
      body,
      options: toRequestOptions(options),
    });
    return unwrapObject<Requirement>(raw, "acknowledge");
  }
}
