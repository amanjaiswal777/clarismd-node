// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import type {
  AuditExportParams,
  AuditListParams,
  AuditLog,
  AuditLogPage,
} from "../types.js";
import { Resource, toRequestOptions } from "./_base.js";
import type { ResourceRequestOptions } from "./_base.js";

function isoDate(value: Date | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function listQuery(params: AuditListParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const start = isoDate(params.startDate);
  const end = isoDate(params.endDate);
  if (start !== undefined) out["start_date"] = start;
  if (end !== undefined) out["end_date"] = end;
  if (params.limit !== undefined) out["limit"] = params.limit;
  if (params.cursor !== undefined) out["cursor"] = params.cursor;
  if (params.requestId !== undefined) out["request_id"] = params.requestId;
  if (params.phiDetected !== undefined)
    out["phi_detected"] = params.phiDetected ? "true" : "false";
  return out;
}

function exportBody(params: AuditExportParams): Record<string, unknown> {
  const out: Record<string, unknown> = { format: params.format };
  const start = isoDate(params.startDate);
  const end = isoDate(params.endDate);
  if (start !== undefined) out["start_date"] = start;
  if (end !== undefined) out["end_date"] = end;
  return out;
}

export class AuditResource extends Resource {
  async list(
    params: AuditListParams = {},
    options?: ResourceRequestOptions,
  ): Promise<AuditLogPage> {
    return this.client.request<AuditLogPage>({
      method: "GET",
      path: "/audit/logs",
      query: listQuery(params),
      options: toRequestOptions(options),
    });
  }

  async get(
    auditId: string,
    options?: ResourceRequestOptions,
  ): Promise<AuditLog> {
    return this.client.request<AuditLog>({
      method: "GET",
      path: `/audit/logs/${encodeURIComponent(auditId)}`,
      options: toRequestOptions(options),
    });
  }

  /**
   * Export an audit evidence package. Returns a `Blob` so callers can
   * `URL.createObjectURL`, write to disk, or pipe to an evidence locker
   * regardless of the format negotiated by the gateway.
   */
  async export(
    params: AuditExportParams,
    options?: ResourceRequestOptions,
  ): Promise<Blob> {
    const response = await this.client.request<Response>({
      method: "POST",
      path: "/audit/export",
      body: exportBody(params),
      options: toRequestOptions(options),
      rawResponse: true,
    });
    return await response.blob();
  }
}
