// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Public response and request types returned by the ClarisMD SDK.
 *
 * These mirror the response shapes in
 * the gateway's v1 API and the Python SDK's `_types.py`.
 * Each interface is extra-fields-tolerant via a `[key: string]: unknown`
 * indexer so additive backend changes don't break SDK consumers pinned
 * to an older version. Once OpenAPI codegen lands these will be replaced
 * by `types.generated.ts` — until then this file is the source of truth.
 */

export type Role = "system" | "user" | "assistant" | "tool";

export type PHIAction = "block" | "redact" | "tokenize" | "alert";

export type AcknowledgmentStatus =
  "pending" | "acknowledged" | "not_applicable" | "auto_satisfied";

// ---------------------------------------------------------------------------
// Chat & completions
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: Role | string;
  content?: string | null;
  name?: string | null;
  tool_calls?: Array<Record<string, unknown>> | null;
  [key: string]: unknown;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason?: string | null;
  logprobs?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  [key: string]: unknown;
}

export interface ChatCompletion {
  id: string;
  object: "chat.completion" | string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: CompletionUsage | null;
  system_fingerprint?: string | null;
  request_id?: string | null;
  [key: string]: unknown;
}

export interface ChatCompletionChunkDelta {
  role?: Role | string | null;
  content?: string | null;
  tool_calls?: Array<Record<string, unknown>> | null;
  [key: string]: unknown;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: ChatCompletionChunkDelta;
  finish_reason?: string | null;
  [key: string]: unknown;
}

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk" | string;
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  request_id?: string | null;
  [key: string]: unknown;
}

export interface TextCompletionChoice {
  index: number;
  text: string;
  finish_reason?: string | null;
  logprobs?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface TextCompletion {
  id: string;
  object: "text_completion" | string;
  created: number;
  model: string;
  choices: TextCompletionChoice[];
  usage?: CompletionUsage | null;
  request_id?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export interface Embedding {
  object: "embedding" | string;
  index: number;
  embedding: number[];
  [key: string]: unknown;
}

export interface EmbeddingResponse {
  object: "list" | string;
  data: Embedding[];
  model: string;
  usage?: CompletionUsage | null;
  request_id?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Moderations
// ---------------------------------------------------------------------------

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
  [key: string]: unknown;
}

export interface ModerationResponse {
  id: string;
  model: string;
  results: ModerationResult[];
  request_id?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// PHI scan
// ---------------------------------------------------------------------------

export interface PHIEntity {
  /** Detector category, e.g. `"pii"`. */
  type: string;
  /** Finer identifier class, e.g. `"ssn"`, `"mrn"`, `"dob"`. */
  subtype?: string | null;
  severity: string;
  confidence: number;
  /** Character offsets into the scanned string. */
  location: { start: number; end: number };
  matched_pattern?: string | null;
  matched_text?: string | null;
  [key: string]: unknown;
}

/** One scan result per input string, in input order. */
export interface PHIScanResult {
  scan_id: string;
  overall_risk_score: number;
  should_block: boolean;
  /** Empty when no PHI/PII was found. */
  entities: PHIEntity[];
  scan_duration_ms?: number | null;
  [key: string]: unknown;
}

/** Response of `POST /v1/phi/scan`: one result per input, in order. */
export interface PHIScanResponse {
  results: PHIScanResult[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  /** ISO-8601 string. Use `new Date(log.created_at)` to parse. */
  created_at?: string | null;
  org_id?: string | null;
  user_id?: string | null;
  /**
   * Position in the organisation's stored hash chain. `null` for entries
   * written before the chain existed.
   */
  chain_seq?: number | null;
  prev_hash?: string | null;
  /** sha256 over the entry's canonical fields and `prev_hash`. */
  entry_hash?: string | null;
  /** The exact timestamp string that `entry_hash` covers. */
  created_at_canonical?: string | null;
  [key: string]: unknown;
}

/** Offset-paginated page of audit logs. */
export interface AuditLogPage {
  logs: AuditLog[];
  /** Total matching entries (all pages). */
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  [key: string]: unknown;
}

/**
 * Signed audit export. JSON exports carry `payload`; PDF exports carry
 * `pdf_base64`. `signature` is `ed25519:<key_id>:<base64>` and verifies
 * offline with the public key at `public_keys_url`.
 */
export interface AuditExport {
  export_id: string;
  format: "json" | "pdf";
  record_count: number;
  /** ISO-8601 string. */
  generated_at: string;
  download_url?: string | null;
  payload?: { logs: AuditLog[]; filters: Record<string, unknown> } | null;
  signature?: string | null;
  signature_alg?: string | null;
  key_id?: string | null;
  public_keys_url?: string | null;
  pdf_base64?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export interface ComplianceCounts {
  satisfied: number;
  total: number;
  acknowledged?: number | null;
  [key: string]: unknown;
}

export interface ComplianceScore {
  auto_verified: ComplianceCounts;
  manual: ComplianceCounts;
  framework: string;
  /** ISO-8601 string. */
  as_of?: string | null;
  request_id?: string | null;
  [key: string]: unknown;
}

export interface Requirement {
  id: string;
  code?: string | null;
  title?: string | null;
  category?: string | null;
  framework: string;
  acknowledgment_status: AcknowledgmentStatus;
  /** ISO-8601 string. */
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  notes?: string | null;
  policy_url?: string | null;
  evidence_count?: number;
  [key: string]: unknown;
}

export interface EvidenceArtifact {
  id: string;
  requirement_id?: string | null;
  audit_log_id?: string | null;
  artifact_type?: string | null;
  evidence_payload?: Record<string, unknown>;
  /** ISO-8601 string. */
  created_at?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

export interface APIKey {
  id: string;
  name?: string | null;
  key_prefix: string;
  /**
   * Full secret token. ONLY present in the response from
   * `client.keys.create()` — it is never returned again, so callers
   * must persist it immediately.
   */
  key?: string | null;
  permissions?: string[] | null;
  revoked: boolean;
  /** ISO-8601 string. */
  created_at: string;
  /** ISO-8601 string. */
  last_used?: string | null;
  /** ISO-8601 string. */
  expires_at?: string | null;
  created_by_session_id?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: string;
  version?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Request param shapes
// ---------------------------------------------------------------------------

export interface ChatCompletionCreateParamsBase {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string | string[];
  user?: string;
  tools?: Array<Record<string, unknown>>;
  tool_choice?: string | Record<string, unknown>;
  response_format?: Record<string, unknown>;
  seed?: number;
  [key: string]: unknown;
}

export interface ChatCompletionCreateParamsNonStreaming extends ChatCompletionCreateParamsBase {
  stream?: false;
}

export interface ChatCompletionCreateParamsStreaming extends ChatCompletionCreateParamsBase {
  stream: true;
}

export type ChatCompletionCreateParams =
  ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming;

export interface CompletionCreateParams {
  model: string;
  prompt: string | string[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stop?: string | string[];
  user?: string;
  [key: string]: unknown;
}

export interface EmbeddingCreateParams {
  model: string;
  input: string | string[];
  user?: string;
  encoding_format?: "float" | "base64";
  dimensions?: number;
  [key: string]: unknown;
}

export interface ModerationCreateParams {
  input: string | string[];
  model?: string;
  [key: string]: unknown;
}

export interface PHIScanParams {
  text: string | string[];
  scan_types?: string[];
  use_ml?: boolean;
  [key: string]: unknown;
}

export interface AuditListParams {
  /** Date object or ISO-8601 string. */
  startDate?: Date | string;
  /** Date object or ISO-8601 string. */
  endDate?: Date | string;
  /** 1–500, default 50. */
  limit?: number;
  /** Number of entries to skip. */
  offset?: number;
  action?: string;
  resourceType?: string;
  requestId?: string;
  phiDetected?: boolean;
}

export interface AuditExportParams {
  /** Default `"json"`. */
  format?: "json" | "pdf";
  startDate?: Date | string;
  endDate?: Date | string;
  requestId?: string;
  phiDetected?: boolean;
}

export interface ComplianceScoreParams {
  framework?: string;
}

export interface ComplianceRequirementsParams {
  framework?: string;
  status?: AcknowledgmentStatus;
  limit?: number;
  cursor?: string;
}

export interface ComplianceAcknowledgeParams {
  status: AcknowledgmentStatus;
  notes?: string;
  policyUrl?: string;
}

export interface KeyCreateParams {
  name?: string;
  permissions?: string[];
  /** 1–365. Omit for a non-expiring key. */
  expiresInDays?: number;
}
