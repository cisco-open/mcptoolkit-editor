# Changelog — mcptoolkit-viewer

All notable changes to `@cisco_open/mcptoolkit-viewer` — the MCP Description Viewer — are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/).

<!-- toc -->

- [[1.0.0-rc.3] — 2026-07-07](#100-rc3--2026-07-07)
- [[1.0.0-rc.2] — 2026-07-06](#100-rc2--2026-07-06)
- [[1.0.0-rc.1] — 2026-06-27](#100-rc1--2026-06-27)

<!-- tocstop -->

## Unreleased


## [1.0.0-rc.3] — 2026-07-07

Version bump for suite alignment with `mcptoolkit-editor`. No changes to the viewer library source.


## [1.0.0-rc.2] — 2026-07-06

### Changed

- **Renamed the package** `mcpdesc-ui` → `@cisco_open/mcptoolkit-viewer`.
  - Global (UMD) API `McpDescUI()` → `McpToolkitViewer()`.
  - Build artifacts `mcpdesc-ui.js`/`.mjs`/`.css` → `mcptoolkit-viewer.js`/`.mjs`/`.css`.
  - CSS scoping class `.mcpdesc-ui-root` → `.mcptoolkit-viewer-root`.
  - Public option/instance types `McpDescUIOptions`/`McpDescUIInstance` → `McpToolkitViewerOptions`/`McpToolkitViewerInstance`.
  - React entry point is now `@cisco_open/mcptoolkit-viewer/react`.


## [1.0.0-rc.1] — 2026-06-27

### Added

Initial open-source release.

- Interactive card-view rendering of MCP Description documents
- Drop-in `<script>` tag usage via `McpToolkitViewer()` and React component export via `@cisco_open/mcptoolkit-viewer/react`
- `renderBadge` prop for pluggable badge rendering (e.g. click-to-navigate in the editor)
- Accepts `spec` (pre-parsed object) or `url` (fetch + auto-parse) inputs
- Light and dark themes
- Tag filter bar and validation panel
- Tailwind CSS scoped via the `.mcptoolkit-viewer-root` container selector
