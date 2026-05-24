# Changelog

All notable changes to `@clarismd/sdk` are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
