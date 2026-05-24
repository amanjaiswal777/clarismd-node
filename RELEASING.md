# Releasing `@clarismd/sdk`

Maintainer-only runbook. Releases are gated on a signed git tag of the
form `v<semver>` and run through GitHub Actions with **npm trusted
publishing (OIDC + provenance)** — no long-lived `NPM_TOKEN` secret in
the repo.

## One-time setup

1. **Reserve the package name** on npm under the `@clarismd` scope:
   ```bash
   npm access ls-packages @clarismd
   ```
   If `@clarismd/sdk` is unowned, claim it from a maintainer account
   while the v0.1.0 publish is pending.

2. **Configure trusted publishing** at
   <https://www.npmjs.com/package/@clarismd/sdk/access>:
   - GitHub repository: `amanjaiswal777/clarismd-node`
   - Workflow filename: `publish.yml`
   - Environment: `release`
   No `NPM_TOKEN` is created or stored.

3. **Create the `release` GitHub environment** with required reviewers
   so a human approves each publish.

## Per-release checklist

1. **Land all PRs** for the version on `main`. CI must be green.
2. **Bump the version** in `package.json` and add an entry to
   `CHANGELOG.md` under a new dated heading. Move items out of
   `[Unreleased]`.
   ```bash
   npm version <patch|minor|major> --no-git-tag-version
   ```
3. **Open a release-prep PR** titled `chore(release): vX.Y.Z` with the
   version bump and changelog. Merge once approved.
4. **Tag and push**:
   ```bash
   git checkout main && git pull
   git tag -s vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```
5. **Approve the workflow** in the GitHub Actions UI. The job:
   - Verifies `package.json` `version` matches the tag
   - Builds (`npm run build`)
   - Publishes with `npm publish --provenance --access public`
6. **Verify on npm**:
   ```bash
   npm view @clarismd/sdk version
   npm view @clarismd/sdk dist.signatures
   ```
   The provenance signature should reference the tagged commit.
7. **Smoke test in a clean dir**:
   ```bash
   mkdir /tmp/cmd-smoke && cd /tmp/cmd-smoke
   npm init -y && npm install @clarismd/sdk@X.Y.Z
   node -e "const { ClarisMD, VERSION } = require('@clarismd/sdk'); console.log(VERSION)"
   ```
8. **Create the GitHub Release** at
   <https://github.com/amanjaiswal777/clarismd-node/releases/new?tag=vX.Y.Z>
   with the changelog excerpt as the body.

## Pre-releases

For `0.1.0-rc.1` style tags, publish to a `next` dist-tag:

```bash
npm dist-tag add @clarismd/sdk@X.Y.Z-rc.1 next
```

Consumers opt in via `npm install @clarismd/sdk@next`. Promote to
`latest` when stable:

```bash
npm dist-tag add @clarismd/sdk@X.Y.Z latest
```

## Rollback

Yanking a published version:

```bash
npm deprecate @clarismd/sdk@X.Y.Z "do not use — see vX.Y.(Z+1)"
```

`npm unpublish` is **not** available for versions older than 72 hours —
deprecate forward instead and ship a fixed `X.Y.(Z+1)`.

## v0.1.0 launch checklist

- [ ] `@clarismd` scope reserved on npm
- [ ] `amanjaiswal777/clarismd-node` repo public on GitHub
- [ ] Trusted publisher configured (workflow `publish.yml`, env `release`)
- [ ] CI green on `main`
- [ ] `CHANGELOG.md` has a `## [0.1.0] - YYYY-MM-DD` heading
- [ ] `package.json` version is `0.1.0`
- [ ] `git tag -s v0.1.0` pushed
- [ ] Publish workflow approved & succeeded
- [ ] `npm view @clarismd/sdk version` returns `0.1.0`
- [ ] GitHub Release created with the v0.1.0 changelog
