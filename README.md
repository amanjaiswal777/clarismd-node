# `@clarismd/sdk`

[![npm](https://img.shields.io/npm/v/@clarismd/sdk.svg)](https://www.npmjs.com/package/@clarismd/sdk)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Official TypeScript SDK for the **ClarisMD** healthcare AI gateway —
PHI scanning, policy enforcement, audit logs, and OpenAI-shaped chat /
embeddings, exposed through a single client.

- **Isomorphic.** Native `fetch` only. Works in Node 18+, modern
  browsers, Cloudflare Workers, Deno, and Bun.
- **Zero runtime dependencies.** ≤ 15 kB gzipped.
- **Strict TypeScript.** Hand-written types ship today; OpenAPI codegen
  drops in once `packages/openapi/v1.yaml` stabilizes.

> ClarisMD is healthcare infrastructure. The SDK does not transmit PHI
> on its own — it is the caller's responsibility to set the gateway
> policy headers (`X-ClarisMD-Policy`, `X-ClarisMD-PHI-Action`)
> appropriately. **No real PHI on hosted demos** — use synthetic data
> only.

---

## Install

```bash
npm install @clarismd/sdk
# pnpm add @clarismd/sdk
# yarn add @clarismd/sdk
# bun add @clarismd/sdk
```

## Quickstart

```ts
import { ClarisMD } from "@clarismd/sdk";

const client = new ClarisMD({ apiKey: process.env.CLARISMD_API_KEY });

const completion = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Summarize this discharge note." }],
});

console.log(completion.choices[0]?.message.content);
```

## Migrating from the OpenAI SDK

Drop-in compatible — change two lines:

```diff
-import OpenAI from "openai";
-const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
+import { ClarisMD } from "@clarismd/sdk";
+const client = new ClarisMD({ apiKey: process.env.CLARISMD_API_KEY });
```

## Self-hosting / private gateways

```ts
const client = new ClarisMD({
  apiKey: process.env.CLARISMD_API_KEY,
  baseURL: "https://gateway.internal.example.com/v1",
});
```

`baseURL` also resolves from `CLARISMD_BASE_URL` if you'd rather keep it
out of code.

## Streaming

```ts
const stream = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Stream me a haiku." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta.content ?? "");
}
```

Mid-stream errors raise the same typed exceptions as synchronous calls —
e.g. `PHIPolicyViolationError` when the gateway blocks an in-flight
generation.

## PHI scan

```ts
const result = await client.phi.scan(
  "Patient John Doe, DOB 1970-01-01, called about test results.",
);
console.log(result.detected, result.entities);
```

## Audit logs

```ts
const page = await client.audit.list({
  startDate: new Date("2026-04-01"),
  endDate: new Date("2026-05-01"),
  phiDetected: true,
  limit: 100,
});

const blob = await client.audit.export({ format: "json" });
// In Node: await Bun.write("audit.json", blob); or fs.writeFileSync(...)
```

## Compliance dashboard

```ts
const score = await client.compliance.score({ framework: "hipaa" });
const requirements = await client.compliance.requirements();
const evidence = await client.compliance.evidence(requirements[0]!.id);
await client.compliance.acknowledge(requirements[0]!.id, {
  status: "acknowledged",
  notes: "Reviewed Q2 2026",
});
```

## Error handling

Every error inherits from `ClarisMDError`. Inspect `instanceof` for
typed handling:

```ts
import {
  PHIPolicyViolationError,
  RateLimitError,
  APITimeoutError,
} from "@clarismd/sdk";

try {
  await client.chat.completions.create({ ... });
} catch (err) {
  if (err instanceof PHIPolicyViolationError) {
    // gateway blocked the request — fall back to a redaction flow
  } else if (err instanceof RateLimitError) {
    // 429 — backoff
  } else if (err instanceof APITimeoutError) {
    // network slow — retry or escalate
  } else {
    throw err;
  }
}
```

The SDK retries `429` / `5xx` / network failures automatically with
exponential backoff (500 ms, 1 s, 2 s) plus ±25% jitter; `Retry-After`
is honored, capped at 60 s. Override per request:

```ts
await client.chat.completions.create({ ... }, { maxRetries: 0 });
```

## AbortSignal

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 30_000);

await client.chat.completions.create(
  { model: "gpt-4o-mini", messages: [...] },
  { signal: controller.signal },
);
```

## ClarisMD-specific options

Per-request:

| Option | Header | Purpose |
|---|---|---|
| `clarismdPolicy` | `X-ClarisMD-Policy` | Override the gateway policy for this call |
| `clarismdPhiAction` | `X-ClarisMD-PHI-Action` | One of `block`, `redact`, `tokenize`, `alert` |
| `idempotencyKey` | `Idempotency-Key` | Pass `false` to disable; pass a string to set verbatim |

POSTs auto-generate `Idempotency-Key: cmd-ts-${uuid}` unless explicitly
disabled.

## Browser usage

> Don't ship your gateway API key in browser-side JavaScript. Mint a
> short-lived scoped key on your backend and inject it into the page or
> exchange it via your own auth endpoint. The SDK runs in browsers; that
> doesn't mean a long-lived key is safe in one.

## Cloudflare Workers

The SDK targets ES2020 + the standard `fetch` / `Response` /
`ReadableStream` / `crypto.randomUUID` APIs available in Workers. See
`examples/cloudflare-worker.ts` for an end-to-end fetch handler.

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

The ClarisMD gateway and dashboard are licensed separately under
AGPL-3.0; this SDK is intentionally permissive so any application can
talk to a ClarisMD gateway regardless of its own license.
