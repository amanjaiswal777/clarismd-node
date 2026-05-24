// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Exception hierarchy for the ClarisMD TypeScript SDK.
 *
 * Mirrors the closed-set `error.type` values defined in the v1 API
 * contract (see `LAUNCH_PLAN/17-v1-api-contract.md`). The mapping is
 * intentionally one-to-one so callers can do
 * `if (err instanceof RateLimitError)` without inspecting status codes.
 */

export class ClarisMDError extends Error {
  override readonly name: string = "ClarisMDError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIConnectionError extends ClarisMDError {
  override readonly name: string = "APIConnectionError";

  constructor(message: string = "Connection error.", options?: ErrorOptions) {
    super(message, options);
  }
}

export class APITimeoutError extends APIConnectionError {
  override readonly name: string = "APITimeoutError";

  constructor(message: string = "Request timed out.", options?: ErrorOptions) {
    super(message, options);
  }
}

export interface APIErrorInit {
  message: string;
  statusCode: number;
  requestId?: string | null;
  code?: string | null;
  param?: string | null;
  type?: string | null;
  body?: unknown;
}

export class APIError extends ClarisMDError {
  override readonly name: string = "APIError";
  readonly statusCode: number;
  readonly requestId: string | null;
  readonly code: string | null;
  readonly param: string | null;
  readonly type: string | null;
  readonly body: unknown;

  constructor(init: APIErrorInit) {
    super(init.message);
    this.statusCode = init.statusCode;
    this.requestId = init.requestId ?? null;
    this.code = init.code ?? null;
    this.param = init.param ?? null;
    this.type = init.type ?? null;
    this.body = init.body;
  }

  override toString(): string {
    const parts: string[] = [];
    if (this.statusCode) parts.push(`[${this.statusCode}]`);
    if (this.code) parts.push(`(${this.code})`);
    parts.push(this.message);
    if (this.requestId) parts.push(`[request_id=${this.requestId}]`);
    return parts.join(" ");
  }
}

export class AuthenticationError extends APIError {
  override readonly name: string = "AuthenticationError";
}
export class PermissionDeniedError extends APIError {
  override readonly name: string = "PermissionDeniedError";
}
export class NotFoundError extends APIError {
  override readonly name: string = "NotFoundError";
}
export class ConflictError extends APIError {
  override readonly name: string = "ConflictError";
}
export class UnprocessableEntityError extends APIError {
  override readonly name: string = "UnprocessableEntityError";
}
export class RateLimitError extends APIError {
  override readonly name: string = "RateLimitError";
}
export class PHIPolicyViolationError extends APIError {
  override readonly name: string = "PHIPolicyViolationError";
}
export class BudgetExceededError extends APIError {
  override readonly name: string = "BudgetExceededError";
}
export class ProviderError extends APIError {
  override readonly name: string = "ProviderError";
}
export class InternalServerError extends APIError {
  override readonly name: string = "InternalServerError";
}

const TYPE_TO_CLASS: Record<string, typeof APIError> = {
  authentication_error: AuthenticationError,
  permission_denied: PermissionDeniedError,
  not_found: NotFoundError,
  conflict: ConflictError,
  unprocessable_entity: UnprocessableEntityError,
  rate_limit_exceeded: RateLimitError,
  phi_policy_violation: PHIPolicyViolationError,
  budget_exceeded: BudgetExceededError,
  provider_error: ProviderError,
  internal_server_error: InternalServerError,
};

const STATUS_FALLBACK: Record<number, typeof APIError> = {
  400: PHIPolicyViolationError,
  401: AuthenticationError,
  402: BudgetExceededError,
  403: PermissionDeniedError,
  404: NotFoundError,
  409: ConflictError,
  422: UnprocessableEntityError,
  429: RateLimitError,
  500: InternalServerError,
  502: ProviderError,
  503: ProviderError,
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface BuildAPIErrorInput {
  statusCode: number;
  requestId?: string | null;
  body: unknown;
}

/**
 * Construct the right APIError subclass from a parsed response body.
 *
 * Selection order:
 *   1. `body.error.type` if present and in the closed set
 *   2. `statusCode` fallback for known HTTP codes
 *   3. Generic `APIError` for anything else (e.g. malformed body)
 */
export function buildAPIError(input: BuildAPIErrorInput): APIError {
  const { statusCode, body } = input;
  let requestId = input.requestId ?? null;

  let errObj: Record<string, unknown> = {};
  if (isPlainObject(body)) {
    const candidate = body["error"];
    if (isPlainObject(candidate)) errObj = candidate;
  }

  const errType = asString(errObj["type"]);
  const errCode = asString(errObj["code"]);
  const errParam = asString(errObj["param"]);
  const rawMessage = asString(errObj["message"]);
  const message = rawMessage ?? `HTTP ${statusCode} from ClarisMD gateway`;

  const envelopeRid = asString(errObj["request_id"]);
  if (envelopeRid) requestId = envelopeRid;

  let cls: typeof APIError = APIError;
  if (errType && TYPE_TO_CLASS[errType]) {
    cls = TYPE_TO_CLASS[errType];
  } else if (STATUS_FALLBACK[statusCode]) {
    cls = STATUS_FALLBACK[statusCode];
  }

  return new cls({
    message,
    statusCode,
    requestId,
    code: errCode,
    param: errParam,
    type: errType,
    body,
  });
}
