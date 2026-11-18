# clarismd-node

`@clarismd/sdk` is the official TypeScript client for the ClarisMD gateway (clarismd-backend `/v1/*`). It is a library, not a service. It covers chat, completions, embeddings, moderations, PHI scan, audit, compliance, keys, and health. Apache-2.0.

## Stack
- TypeScript 6, strict ESM (`"type": "module"`). Built with tsup to ESM `.mjs`, CJS `.cjs`, and d.ts.
- ZERO runtime dependencies (native `fetch`). Must stay isomorphic: Node >=18, browsers, Cloudflare Workers, Deno, Bun. Ask before adding any dependency.
- npm (`package-lock.json`). CI uses Node 22/24.

## Commands
- Install: `npm install` (CI uses `npm ci`). node_modules is not installed yet.
- Test: `npm test` (vitest run). Coverage: `npm run test:coverage`.
  - Single test: `npx vitest run tests/chat.test.ts` or `npx vitest run -t "name"`
- Lint: `npm run lint` (eslint src tests)
- Type-check: `npm run typecheck` (tsc --noEmit)
- Format: `npm run format`. Check: `npm run format:check` (CI runs `npx prettier --check src tests examples`).
- Build: `npm run build`. Size budget: `npm run size` (15 KB gzip limit on `dist/index.{mjs,cjs}`).
- Workers compat: `npm i --no-save @cloudflare/vitest-pool-workers && npm run test:workers`. Known broken: it has no vitest-5 release, and CI marks the job `continue-on-error`.
- Codegen: `bash scripts/codegen.sh ../clarismd-backend/packages/openapi/v1.yaml`. Always pass the path: the default `../packages/...` points at the old monorepo and doesn't exist.
- Full check before done: `npm run lint && npm run typecheck && npm run format:check && npm test && npm run build && npm run size`

## Layout
- `src/index.ts` holds exports. `src/client.ts` is the `ClarisMD` class.
- `src/core/`: api-client (base URL, auth), streaming (SSE), errors, retry, idempotency.
- `src/resources/`: one file per API area, plus `_base.ts`.
- `src/types.ts` holds the hand-written types and is the source of truth. `src/types.generated.ts` is an empty codegen stub.
- `tests/*.test.ts` use fetch mocked via `tests/_helpers.ts`. `tests/worker-compat.test.ts` only runs under the workerd config.
- `examples/`: runnable TS examples, including `cloudflare-worker.ts`.

## Conventions
- Prettier: double quotes, trailing commas, width 80.
- ESLint flat config with typescript-eslint:
  - Use inline `import { type X }` (`consistent-type-imports`).
  - Unused vars need a `_` prefix.
- Coverage thresholds: 85% lines/statements/functions, 75% branches.
- Env: `CLARISMD_API_KEY` (Bearer) and `CLARISMD_BASE_URL` (default `https://api.clarismd.com/v1`).
- Headers: `X-ClarisMD-Policy`, `X-ClarisMD-PHI-Action`, and an auto `Idempotency-Key: cmd-ts-<uuid>` on POST.
- Keep the API surface parallel with clarismd-python (`clarismdPolicy` / `clarismd_policy`). API changes start in the backend spec.
- Note user-visible changes in `CHANGELOG.md` under `[Unreleased]`.
- Conventional Commits with DCO sign-off (`git commit -s`). Never commit or push yourself.

## Release (don't trigger)
`.github/workflows/publish.yml` runs on a `v*` tag.
1. It needs approval in the `release` environment.
2. The tag must equal the `package.json` version.
3. It reruns all checks, then `npm publish --provenance`.
