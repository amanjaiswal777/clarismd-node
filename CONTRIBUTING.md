# Contributing to `@clarismd/sdk`

Thanks for considering a contribution! This SDK is a thin TypeScript
client for the ClarisMD gateway — please keep changes focused on the
client surface, not on gateway-side policy logic.

## License & sign-off

By submitting a contribution you agree your code is licensed under
**Apache-2.0** (inbound = outbound). We require a Developer Certificate
of Origin sign-off on every commit:

```bash
git commit -s -m "your message"
```

The `-s` flag adds a `Signed-off-by:` trailer with your name and email.
PRs without sign-offs will be asked to amend.

## Security issues

**Do not open a public issue or PR for security vulnerabilities.** See
[`SECURITY.md`](./SECURITY.md) — email `security@clarismd.com` and we'll
coordinate a fix and disclosure.

## Dev setup

Prereqs: **Node.js 18+**, npm 10+ (or pnpm/yarn).

```bash
git clone https://github.com/clarismd/clarismd-node.git
cd clarismd-node
npm install
```

The repo has no runtime dependencies — only devDependencies for the
build, lint, and test toolchain.

## Development loop

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint over `src/` and `tests/` |
| `npm run typecheck` | `tsc --noEmit` strict mode |
| `npm test` | Vitest unit + integration suite |
| `npm run test:coverage` | Vitest with v8 coverage report |
| `npm run test:workers` | Vitest in `workerd` (Cloudflare Workers compat) |
| `npm run build` | tsup → ESM (`.mjs`) + CJS (`.cjs`) + `.d.ts` |
| `npm run size` | Enforce gzip bundle ceiling (15 KB) via `size-limit` |

All five gates run in CI on every PR. Please run them locally before
opening a PR — failing CI rounds are slow.

## Code style

- **Strict TypeScript** — no `any` in public surface; use `unknown` and
  narrow.
- **No runtime deps.** The SDK ships with zero `dependencies` so any app
  can install it without dragging in a tree. New runtime deps require
  discussion.
- **Native `fetch` only.** Don't reach for `axios`/`node-fetch`/`undici` —
  the SDK targets Node 18+, browsers, Workers, Deno, and Bun, all of
  which expose the global `fetch`.
- **Hand-written types in `src/types.ts`.** OpenAPI-generated types live
  in `src/types.generated.ts` (currently unused; lit up by
  `scripts/codegen.sh` once the gateway's OpenAPI schema stabilizes).
- **No business logic.** PHI detection, policy evaluation, compliance
  scoring all live server-side. The SDK is HTTP plumbing + response
  parsing only.
- **Match the Python SDK shape.** `clarismdPolicy` here ↔
  `clarismd_policy` there. Mirror request options, error names, and
  resource methods so users can move between languages.

## Pull requests

1. **Branch from `main`.**
2. **One concern per PR.** Refactors and feature changes go in separate
   PRs.
3. **Tests are mandatory** for new public surface. Use `pytest`-style
   AAA structure (`describe` + `it` blocks; arrange → act → assert).
4. **Update `CHANGELOG.md`** under the `[Unreleased]` heading for any
   user-visible change. Use Keep-a-Changelog sections (Added, Changed,
   Fixed, Removed, Deprecated, Security).
5. **All checks must pass locally** (lint, typecheck, test, build, size).
6. **Sign your commits** with `-s` (DCO).

## Releasing

Maintainers only — see [`RELEASING.md`](./RELEASING.md) for the full
runbook (npm publish via OIDC trusted publisher, version bump, tag).

## Questions

Open a GitHub Discussion or a draft PR if you'd like an early read
before investing significant effort.
