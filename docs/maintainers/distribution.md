# Distribution Model

This repository is part of the **MCP Toolkit** suite. It is an npm workspaces
monorepo that produces three separately distributed artifacts with different
delivery mechanisms.

## Overview

| Artifact | Package | Distribution | Published to npm? |
|----------|---------|--------------|-------------------|
| MCP Description Editor (source) | `mcptoolkit-editor` (root, `private: true`) | Hosted static site | No |
| MCP Toolkit Viewer | `@cisco_open/mcptoolkit-viewer` (`packages/mcptoolkit-viewer/`) | npm package | Yes |
| MCP Editor (prebuilt bundle) | `@cisco_open/mcptoolkit-editor-dist` (`packages/mcptoolkit-editor-dist/`) | npm package | Yes |

### Why these delivery mechanisms?

- The **editor source** (`mcptoolkit-editor`, root) is a full React + Monaco
  single-page application. The root `package.json` stays `"private": true` so it
  is never published to npm directly; it is deployed as a hosted web app or
  consumed via the prebuilt `-dist` package below.
- The **viewer** (`@cisco_open/mcptoolkit-viewer`) is a small, embeddable
  card-view component — analogous to what Swagger UI is to the Swagger Editor.
  Other MCP Toolkit projects consume it programmatically, so it is **published
  to npm** with both a UMD (`<script>` tag) and ESM/React entry point.
- The **prebuilt editor bundle** (`@cisco_open/mcptoolkit-editor-dist`) ships the
  compiled editor `dist/` — the analog of `swagger-editor-dist`. Hosts consume a
  portable, host-neutral build (no CDN dependency, relative asset paths, works
  under a strict CSP) without building from source. This keeps the editor a
  portable tool while hosting lives in a separate repo.

## The viewer: npm package

### Package identity

- **Name:** `@cisco_open/mcptoolkit-viewer`
- **Global (UMD):** `McpToolkitViewer(...)`
- **Build artifacts:** `dist/mcptoolkit-viewer.js` (UMD), `dist/mcptoolkit-viewer.mjs` (ESM), `dist/mcptoolkit-viewer.css`
- **CSS scoping class:** `.mcptoolkit-viewer-root`
- **React entry:** `@cisco_open/mcptoolkit-viewer/react` (exports `McpDescCardView`)

> Note: types prefixed with `McpDesc*` (e.g. `McpDescDocument`, `McpDescCardView`)
> refer to the **MCP Description** format/spec and are intentionally retained.
> Only the viewer package's own identity uses the `mcptoolkit-viewer` /
> `McpToolkitViewer` naming.

### Consuming the viewer

Script tag:

```html
<link rel="stylesheet" href="dist/mcptoolkit-viewer.css">
<div id="mcpdesc"></div>
<script src="dist/mcptoolkit-viewer.js"></script>
<script>
  McpToolkitViewer({ dom_id: '#mcpdesc', url: '/api/mcpdesc.yaml' });
</script>
```

React component:

```tsx
import { McpDescCardView } from '@cisco_open/mcptoolkit-viewer/react';
import '@cisco_open/mcptoolkit-viewer/dist/mcptoolkit-viewer.css';

<div className="mcptoolkit-viewer-root">
  <McpDescCardView doc={doc} validation={validation} />
</div>
```

### Release / publish flow

Publishing is tag-driven via [`../../.github/workflows/publish.yml`](../../.github/workflows/publish.yml):

1. Bump `version` in
   [`packages/mcptoolkit-viewer/package.json`](../../packages/mcptoolkit-viewer/package.json)
   and the `version` constant in `packages/mcptoolkit-viewer/src/index.tsx`.
2. Update both changelogs (root `CHANGELOG.md` and the viewer's `CHANGELOG.md`)
   per the rules in [`../../AGENTS.md`](../../AGENTS.md).
3. Verify the library builds: `npm run build --workspace=packages/mcptoolkit-viewer`.
4. Merge to `main`, then push a `viewer-v<version>` tag.
5. The workflow verifies the tag matches the viewer's `package.json` version,
   builds the workspace, and runs `npm publish --workspace=packages/mcptoolkit-viewer`
   with provenance. It selects the dist-tag automatically:
   - Pre-release versions (contain `-`, e.g. `1.0.0-rc.2`) → `next`
   - Stable versions → `latest`

The `NPM_TOKEN` repository secret authorizes the publish.

## Tag & version convention

The editor-dist bundle is the **primary** artifact, so it releases on the
**default bare `v<version>` tag**. The viewer is released less often and uses the
explicit `viewer-v<version>` prefix.

| Package | Release tag | Example | Workflow |
|---------|-------------|---------|----------|
| `@cisco_open/mcptoolkit-editor-dist` (primary) | `v<version>` (default) | `v1.1.0-rc.2` | [`publish-editor-dist.yml`](../../.github/workflows/publish-editor-dist.yml) |
| `@cisco_open/mcptoolkit-viewer` | `viewer-v<version>` | `viewer-v1.0.0` | [`publish.yml`](../../.github/workflows/publish.yml) |

Each workflow verifies the pushed tag (minus its `v` / `viewer-v` prefix) matches
its package's `version`, so a mismatched tag fails fast instead of publishing the
wrong thing. The editor-dist trigger is globbed as **`v[0-9]*`** (not plain `v*`)
so it matches `v1.2.3` but never the viewer's `viewer-v*` tags — both start with
`v`. The `next`/`latest` dist-tag rule (pre-release `-rc.N` → `next`, stable →
`latest`) applies to both.

### Version alignment

The two published packages track **different** version lines:

- **`@cisco_open/mcptoolkit-editor-dist` mirrors the root editor app version.**
  It is literally the built root app, so `packages/mcptoolkit-editor-dist/package.json`
  must always equal the root `package.json` version (root is the source of
  truth). `npm run verify:versions` — the first step of `npm run prerelease` —
  fails on drift; `npm run sync:version` copies the root version into the
  editor-dist manifest. So bump the **root** version and let the editor-dist
  follow; do not bump the editor-dist manifest by hand.
- **`@cisco_open/mcptoolkit-viewer` versions independently** of the editor and
  is never touched by the alignment scripts.

## The editor: hosted static site

The editor is pure client-side — there is no backend.

```bash
npm run build     # → dist/
npx serve dist    # or deploy dist/ to any static host
```

Deploy the `dist/` output to any static host (GitHub Pages, Netlify, Vercel,
S3/CloudFront, Cloudflare Pages, …). The build is host-neutral: Monaco and its
web workers are self-hosted (no CDN), asset paths are relative (Vite
`base: './'`), and the app runs under a strict Content-Security-Policy. A
default CSP (plus `X-Content-Type-Options` and `Referrer-Policy`) is shipped in
[`../../public/_headers`](../../public/_headers) for hosts that honor it. The
deployed site should link back to this source repository.

## The prebuilt editor bundle: `@cisco_open/mcptoolkit-editor-dist`

This package ships the compiled editor `dist/` so hosts can serve a portable
build without building from source — the `swagger-editor-dist` analog.

### Package identity

- **Name:** `@cisco_open/mcptoolkit-editor-dist`
- **Contents:** `dist/index.html`, hashed `dist/assets/*` (JS/CSS + Monaco
  workers), and `dist/_headers`.
- **Build:** `npm run build --workspace=packages/mcptoolkit-editor-dist` runs the
  root app build and copies the resulting `dist/` into the package
  (see `packages/mcptoolkit-editor-dist/scripts/build.mjs`).

### Consuming the prebuilt bundle

```bash
npx serve node_modules/@cisco_open/mcptoolkit-editor-dist/dist
# or copy dist/ into a web root / Cloudflare Pages output directory
```

Because asset paths are relative, the bundle can be served from any origin,
subdomain, or subpath.

### Release / publish flow

Publishing is tag-driven via
[`../../.github/workflows/publish-editor-dist.yml`](../../.github/workflows/publish-editor-dist.yml).
It uses the **default bare `v<version>` tag** (the editor-dist bundle is the
primary artifact; see [Tag & version convention](#tag--version-convention)).

1. Bump the **root** `package.json` version and run `npm run sync:version` so the
   editor-dist manifest matches (root is the source of truth); roll up the
   package's `CHANGELOG.md`.
2. Merge to `main`, then push a `v<version>` tag.
3. The workflow verifies the tag matches the package version, builds the bundle,
   and runs `npm publish --workspace=packages/mcptoolkit-editor-dist` with
   provenance. Dist-tag selection matches the viewer: pre-release (`-rc.N`) →
   `next`, stable → `latest`. The `NPM_TOKEN` secret authorizes the publish.

## Related design notes

- [`mcptoolkit-viewer-options.md`](mcptoolkit-viewer-options.md) — the original
  arbitration between a CLI-generated static HTML card view and the standalone
  JS bundle that became `@cisco_open/mcptoolkit-viewer`.
- [`analytics.md`](analytics.md) — options and considerations for install-time
  and runtime analytics across the three artifacts (currently: none by default).
