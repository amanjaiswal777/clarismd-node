# Changelog

All notable changes to `@clarismd/sdk` are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `clarismdPolicy` / `clarismdPhiAction` are now honored by the gateway (they
  were sent but ignored). Both are tighten-only; invalid values are rejected
  with a 422. See "ClarisMD-specific options" in the README.
- **Breaking (types):** the two options moved from `ResourceRequestOptions` to
  the new `GovernedRequestOptions`, accepted by `chat.completions.create` and
  `completions.create` only. Other endpoints never applied them.
- **Breaking:** `keys`, `phi.scan` and `audit` now match what the gateway
  actually returns (the previous types described shapes it never sent, so
  e.g. `keys.create().secret` and `phi.scan().entities` were always empty):
  - `keys.create({ name?, permissions?, expiresInDays? })`; the one-time
    secret is in `key`. `APIKey` fields are `key_prefix`, `permissions`,
    `revoked`, `last_used`, `expires_at` (were `prefix`, `scopes`,
    `revoked_at`, `last_used_at`, `secret`).
  - `phi.scan()` returns `PHIScanResponse` — `{ results: PHIScanResult[] }`,
    one per input — with entities `{ type, subtype, severity, confidence,
location: { start, end }, matched_text }`. Options are `scanTypes` /
    `useMl`; `returnEntities` is removed (the gateway ignored it).
  - `audit.list()` uses `offset` paging (the gateway ignored `cursor`) and
    returns `{ logs, total, limit, offset, has_more }`; new `action` and
    `resourceType` filters. `AuditLog` matches the gateway's entry shape,
    including the hash-chain fields `chain_seq`, `prev_hash`, `entry_hash`.
  - `audit.export()` returns the typed, Ed25519-signed `AuditExport` instead
    of a `Blob`; `format` is `"json" | "pdf"` (`csv` / `ndjson` were always
    rejected with a 422). New `requestId` / `phiDetected` filters.
- A plain string `user` on chat/completions is now accepted by the gateway
  (it was rejected with a 422).
- `npm run codegen` reads the spec from `../clarismd-backend/packages/openapi/v1.yaml`
  (the old default path did not exist).

### Documented

- Agent gate: `metadata.agent_id` on chat/completions runs the agent's gate
  check before the provider call.
- Verifying signed evidence offline.

### Added

- `client.health.check()` — `GET /v1/health` reachability probe returning
  the typed `HealthStatus` (status string, gateway version, passthrough
  fields). Mirrors the Python SDK's `client.health.check()`.

## [0.1.0] — 2026-05-24

### Added

- Initial release of the official ClarisMD TypeScript SDK.
- Sync surface: `ClarisMD` class with `chat`, `completions`, `embeddings`,
  `moderations`, `phi`, `audit`, `compliance`, `keys` resource namespaces.
- Streaming: `client.chat.completions.create({ stream: true })` returns an
  `AsyncIterable<ChatCompletionChunk>` that terminates on `data: [DONE]`
  and surfaces mid-stream errors as typed exceptions.
- Closed-set error hierarchy mirroring the v1 API contract: ten
  `error.type`-mapped subclasses plus `APIConnectionError` /
  `APITimeoutError` for transport failures.
- Automatic retry on 429 / 5xx / network failures with `Retry-After`
  honored (capped at 60 s); exponential backoff with jitter; configurable
  `maxRetries` (default 2).
- Auto-generated `Idempotency-Key: cmd-ts-${uuid}` on every POST,
  overridable per-request.
- Native `fetch` only — works in Node 18+, modern browsers, Cloudflare
  Workers, Deno, and Bun. **Zero runtime dependencies.**
- Dual ESM + CJS build via `tsup`. Bundle ≤ 15 kB gzipped.
- `AbortSignal` cancellation supported on every request.
- TypeScript strict-mode clean; ships `.d.ts` declarations.
- Worker-compat smoke test under `@cloudflare/vitest-pool-workers`.

[Unreleased]: https://github.com/amanjaiswal777/clarismd-node/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/amanjaiswal777/clarismd-node/releases/tag/v0.1.0
