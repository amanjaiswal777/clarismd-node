// Copyright (c) 2026 ClarisMD contributors.
// SPDX-License-Identifier: Apache-2.0

import {
  APIClient,
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  type FetchLike,
} from "./core/api-client.js";
import { ClarisMDError } from "./core/errors.js";
import { AuditResource } from "./resources/audit.js";
import { ChatResource } from "./resources/chat.js";
import { CompletionsResource } from "./resources/completions.js";
import { ComplianceResource } from "./resources/compliance.js";
import { EmbeddingsResource } from "./resources/embeddings.js";
import { HealthResource } from "./resources/health.js";
import { KeysResource } from "./resources/keys.js";
import { ModerationsResource } from "./resources/moderations.js";
import { PHIResource } from "./resources/phi.js";

export interface ClarisMDOptions {
  /**
   * Bearer token for the gateway. Falls back to `process.env.CLARISMD_API_KEY`
   * in environments where `process.env` exists (Node, Deno with `--allow-env`).
   * Browser bundles must pass this explicitly — never hard-code a key into
   * client-side JS.
   */
  apiKey?: string;
  /**
   * Override the gateway URL. Defaults to
   * `process.env.CLARISMD_BASE_URL` then `https://api.clarismd.com/v1`.
   */
  baseURL?: string;
  /** Per-request timeout in ms. Default 60_000. */
  timeout?: number;
  /** Max retries on 429/5xx/network failures. Default 2. */
  maxRetries?: number;
  /** Headers merged onto every outgoing request. */
  defaultHeaders?: Record<string, string>;
  /**
   * Custom fetch implementation. Useful for tests and runtimes that
   * expose a non-global fetch (e.g. legacy Node 18 with bundlers that
   * don't polyfill the global).
   */
  fetch?: FetchLike;
}

function readEnv(name: string): string | undefined {
  // `process` may not exist in browsers / Workers / Deno without env perm.
  const proc = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process;
  if (!proc?.env) return undefined;
  const value = proc.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Top-level SDK client. Resource namespaces hang off this one instance.
 *
 *   const client = new ClarisMD({ apiKey: "sk-..." });
 *   const chat = await client.chat.completions.create({ ... });
 */
export class ClarisMD {
  readonly chat: ChatResource;
  readonly completions: CompletionsResource;
  readonly embeddings: EmbeddingsResource;
  readonly moderations: ModerationsResource;
  readonly phi: PHIResource;
  readonly audit: AuditResource;
  readonly compliance: ComplianceResource;
  readonly keys: KeysResource;
  readonly health: HealthResource;

  /** Underlying transport — exposed for advanced consumers. */
  readonly apiClient: APIClient;

  constructor(options: ClarisMDOptions = {}) {
    const apiKey = options.apiKey ?? readEnv("CLARISMD_API_KEY");
    if (!apiKey) {
      throw new ClarisMDError(
        "ClarisMD: missing API key. Pass `apiKey` to the constructor or set CLARISMD_API_KEY.",
      );
    }
    const baseURL =
      options.baseURL ?? readEnv("CLARISMD_BASE_URL") ?? DEFAULT_BASE_URL;

    this.apiClient = new APIClient({
      apiKey,
      baseURL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      defaultHeaders: options.defaultHeaders,
      ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    });

    this.chat = new ChatResource(this.apiClient);
    this.completions = new CompletionsResource(this.apiClient);
    this.embeddings = new EmbeddingsResource(this.apiClient);
    this.moderations = new ModerationsResource(this.apiClient);
    this.phi = new PHIResource(this.apiClient);
    this.audit = new AuditResource(this.apiClient);
    this.compliance = new ComplianceResource(this.apiClient);
    this.keys = new KeysResource(this.apiClient);
    this.health = new HealthResource(this.apiClient);
  }
}
