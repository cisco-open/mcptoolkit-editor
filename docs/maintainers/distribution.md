# Distribution Model

This repository is part of the **MCP Toolkit** suite. It is an npm workspaces
monorepo that produces two separately distributed artifacts with different
delivery mechanisms.

## Overview

| Artifact | Package | Distribution | Published to npm? |
|----------|---------|--------------|-------------------|
| MCP Description Editor | `mcptoolkit-editor` (root, `private: true`) | Hosted static site | No |
| MCP Toolkit Viewer | `@cisco_open/mcptoolkit-viewer` (`packages/mcptoolkit-viewer/`) | npm package | Yes |

### Why two delivery mechanisms?

- The **editor** is a full React + Monaco single-page application. It is a tool
  for humans to author, validate, and preview MCP Description documents. It has
  no meaningful programmatic API surface, so it is delivered as a **hosted web
  app** rather than a library. The root `package.json` is marked
  `"private": true` to prevent accidental npm publication.
- The **viewer** (`@cisco_open/mcptoolkit-viewer`) is a small, embeddable
  card-view component — analogous to what Swagger UI is to the Swagger Editor.
  Other MCP Toolkit projects consume it programmatically, so it is **published
  to npm** with both a UMD (`<script>` tag) and ESM/React entry point.

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
4. Merge to `main`, then push a `v<version>` tag.
5. The workflow verifies the tag matches the viewer's `package.json` version,
   builds the workspace, and runs `npm publish --workspace=packages/mcptoolkit-viewer`
   with provenance. It selects the dist-tag automatically:
   - Pre-release versions (contain `-`, e.g. `1.0.0-rc.2`) → `next`
   - Stable versions → `latest`

The `NPM_TOKEN` repository secret authorizes the publish.

## The editor: hosted static site

The editor is pure client-side — there is no backend.

```bash
npm run build     # → dist/
npx serve dist    # or deploy dist/ to any static host
```

Deploy the `dist/` output to any static host (GitHub Pages, Netlify, Vercel,
S3/CloudFront, …). The deployed site should link back to this source
repository. The specific hosting target is TBD.

## Related design notes

- [`mcptoolkit-viewer-options.md`](mcptoolkit-viewer-options.md) — the original
  arbitration between a CLI-generated static HTML card view and the standalone
  JS bundle that became `@cisco_open/mcptoolkit-viewer`.
