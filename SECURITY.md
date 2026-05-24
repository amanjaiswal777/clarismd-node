# Security policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in `@clarismd/sdk`,
**please do not open a public GitHub issue or PR.** ClarisMD is used in
healthcare contexts where exposure can have outsized real-world impact.

Email **security@clarismd.com** with:

- A description of the issue and the impact (data exposure, auth
  bypass, denial-of-service, etc.)
- Steps to reproduce — minimal repro is ideal
- The affected version(s)
- Your name / handle for credit (optional)

If your finding is confirmed, we'll coordinate a private fix, a
released patch, and a public advisory. Our default disclosure window is
**90 days** from the initial report; we'll publish sooner if a fix is
already shipped and we think disclosure is in users' interest.

## What's in scope

- Issues in **this SDK** that allow an attacker to leak credentials,
  exfiltrate request/response bodies the caller didn't authorize,
  bypass TLS verification, or cause memory/CPU exhaustion in normal
  use.
- Supply-chain issues (compromised dependencies, suspicious package
  metadata, missing provenance).

## What's out of scope

- The ClarisMD gateway itself — that has its own security policy at
  the backend repository.
- Misuse by an authenticated client of an API the gateway is configured
  to allow (that's a policy / configuration issue, not an SDK bug).
- Issues only reproducible with patched / forked dependencies.

## Supported versions

We patch security issues in the **latest minor release line**. Older
minors get fixes only if the impact is severe and a backport is low
risk.

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Coordinated disclosure

We use [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories)
for published advisories so they appear in `npm audit` / GitHub's
dependency alerts. Reports that include a CVE request will get one.

Thank you for helping keep ClarisMD users safe.
