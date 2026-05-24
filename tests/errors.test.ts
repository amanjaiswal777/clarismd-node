// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  APIError,
  AuthenticationError,
  BudgetExceededError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  PHIPolicyViolationError,
  PermissionDeniedError,
  ProviderError,
  RateLimitError,
  UnprocessableEntityError,
} from "../src/index.js";
import { buildAPIError } from "../src/core/errors.js";

const TYPE_CASES: Array<[string, number, new (...args: never[]) => APIError]> = [
  ["authentication_error", 401, AuthenticationError],
  ["permission_denied", 403, PermissionDeniedError],
  ["not_found", 404, NotFoundError],
  ["conflict", 409, ConflictError],
  ["unprocessable_entity", 422, UnprocessableEntityError],
  ["rate_limit_exceeded", 429, RateLimitError],
  ["phi_policy_violation", 400, PHIPolicyViolationError],
  ["budget_exceeded", 402, BudgetExceededError],
  ["provider_error", 502, ProviderError],
  ["internal_server_error", 500, InternalServerError],
];

describe("buildAPIError", () => {
  it.each(TYPE_CASES)(
    "%s → mapped subclass",
    (errType, status, cls) => {
      const err = buildAPIError({
        statusCode: status,
        requestId: "req_x",
        body: { error: { type: errType, message: "boom", code: "c" } },
      });
      expect(err).toBeInstanceOf(cls);
      expect(err.requestId).toBe("req_x");
      expect(err.code).toBe("c");
      expect(err.message).toBe("boom");
    },
  );

  it("falls back on status when error.type is missing", () => {
    const err = buildAPIError({
      statusCode: 401,
      body: { error: { message: "no type" } },
    });
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("returns generic APIError on unknown status with no type", () => {
    const err = buildAPIError({
      statusCode: 418,
      body: { error: { message: "teapot" } },
    });
    expect(err).toBeInstanceOf(APIError);
    expect(err).not.toBeInstanceOf(NotFoundError);
  });

  it("tolerates malformed body", () => {
    const err = buildAPIError({ statusCode: 500, body: "raw text" });
    expect(err).toBeInstanceOf(InternalServerError);
    expect(err.message).toMatch(/HTTP 500/);
    expect(err.body).toBe("raw text");
  });

  it("toString includes status, code, and request id", () => {
    const err = buildAPIError({
      statusCode: 404,
      requestId: "req_42",
      body: { error: { type: "not_found", message: "gone", code: "lost" } },
    });
    const str = err.toString();
    expect(str).toContain("[404]");
    expect(str).toContain("(lost)");
    expect(str).toContain("gone");
    expect(str).toContain("req_42");
  });

  it("prefers envelope request_id over header", () => {
    const err = buildAPIError({
      statusCode: 500,
      requestId: "from_header",
      body: { error: { request_id: "from_envelope", message: "x" } },
    });
    expect(err.requestId).toBe("from_envelope");
  });
});
