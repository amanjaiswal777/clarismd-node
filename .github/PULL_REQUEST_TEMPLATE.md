<!--
Thanks for the contribution! A few quick checks before you submit.
For security fixes, please coordinate via security@clarismd.com first
(see SECURITY.md) rather than opening a public PR.
-->

## What this PR does

<!-- One or two sentences. Why is this change needed? Link the issue
     it resolves with `Closes #nnn` if applicable. -->

## How to verify

<!-- Reviewer-runnable steps: commands, expected output, screenshots. -->

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run size
```

## Checklist

- [ ] Tests added or updated for the change
- [ ] `npm test` passes locally with coverage maintained
- [ ] `npm run typecheck` is clean (strict mode)
- [ ] `npm run lint` is clean
- [ ] `npx prettier --check src tests examples` is clean
- [ ] `npm run build && npm run size` passes the 15 KB gzip ceiling
- [ ] CHANGELOG.md updated under `[Unreleased]` for any user-visible change
- [ ] Public API additions have JSDoc and TypeScript types
- [ ] Cross-SDK parity considered (clarismd-python equivalent if applicable)
- [ ] Commits are signed off (`git commit -s`)
