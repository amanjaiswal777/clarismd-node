// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * `@clarismd/sdk` — official TypeScript SDK for the ClarisMD healthcare AI gateway.
 *
 * Apache-2.0 licensed. Zero runtime dependencies. Native `fetch` only.
 * Works in Node 18+, modern browsers, Cloudflare Workers, Deno, and Bun.
 */

export { ClarisMD } from "./client.js";
export type { ClarisMDOptions } from "./client.js";

export { ChatResource, ChatCompletionsResource } from "./resources/chat.js";
export { CompletionsResource } from "./resources/completions.js";
export { EmbeddingsResource } from "./resources/embeddings.js";
export { ModerationsResource } from "./resources/moderations.js";
export { PHIResource } from "./resources/phi.js";
export type { PHIScanOptions } from "./resources/phi.js";
export { AuditResource } from "./resources/audit.js";
export { ComplianceResource } from "./resources/compliance.js";
export { KeysResource } from "./resources/keys.js";
export { HealthResource } from "./resources/health.js";
export type { ResourceRequestOptions } from "./resources/_base.js";

// Streaming primitives.
export { Stream } from "./core/streaming.js";

// Error hierarchy — all instances of `ClarisMDError`.
export {
  APIConnectionError,
  APIError,
  APITimeoutError,
  AuthenticationError,
  BudgetExceededError,
  ClarisMDError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  PHIPolicyViolationError,
  ProviderError,
  RateLimitError,
  UnprocessableEntityError,
} from "./core/errors.js";

// Public response/request types.
export type {
  AcknowledgmentStatus,
  APIKey,
  AuditExportParams,
  AuditListParams,
  AuditLog,
  AuditLogPage,
  ChatCompletion,
  ChatCompletionChoice,
  ChatCompletionChunk,
  ChatCompletionChunkChoice,
  ChatCompletionChunkDelta,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatMessage,
  ComplianceAcknowledgeParams,
  ComplianceCounts,
  ComplianceRequirementsParams,
  ComplianceScore,
  ComplianceScoreParams,
  CompletionCreateParams,
  CompletionUsage,
  Embedding,
  EmbeddingCreateParams,
  EmbeddingResponse,
  EvidenceArtifact,
  HealthStatus,
  KeyCreateParams,
  ModerationCreateParams,
  ModerationResponse,
  ModerationResult,
  PHIAction,
  PHIEntity,
  PHIScanParams,
  PHIScanResult,
  Requirement,
  Role,
  TextCompletion,
  TextCompletionChoice,
} from "./types.js";

export const VERSION = "0.1.0";
