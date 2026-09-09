# Changelog — mcptoolkit-viewer

All notable changes to `@cisco_open/mcptoolkit-viewer` — the MCP Description Viewer — are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/).

<!-- toc -->

- [Unreleased](#unreleased)
- [[2.2.0] — 2026-09-09](#220--2026-09-09)
- [[2.1.1] — 2026-09-08](#211--2026-09-08)
- [[2.1.0] — 2026-09-08](#210--2026-09-08)
- [[2.0.1] — 2026-09-07](#201--2026-09-07)
- [[2.0.0] — 2026-09-07](#200--2026-09-07)
- [[2.0.0-rc.1] — 2026-09-04](#200-rc1--2026-09-04)
- [[1.0.0] — 2026-07-07](#100--2026-07-07)
- [[1.0.0-rc.3] — 2026-07-07](#100-rc3--2026-07-07)
- [[1.0.0-rc.2] — 2026-07-06](#100-rc2--2026-07-06)
- [[1.0.0-rc.1] — 2026-06-27](#100-rc1--2026-06-27)

<!-- tocstop -->

## Unreleased

## [2.2.0] — 2026-09-09

### Changed

- Target the stable MCP Description `0.8.0` specification for card rendering,
  effective protocol views, and reusable component references.

## [2.1.1] — 2026-09-08

### Added

- Export the viewer's bundled YAML parser for browser integrations.

### Fixed

- Build the standalone demo's grouped examples menu from `examples/config.yaml`
  and load its configured default instead of stale hard-coded file paths.

## [2.1.0] — 2026-09-08

### Changed

- Refine protocol version displays with crisp custom radios, consistent light
  backgrounds, and more compact labels.

### Security

- Sanitize description Markdown before inserting it into the card view DOM.

## [2.0.1] — 2026-09-07

### Security

- Rebuild the viewer after updating transitive dependencies to patched versions
  with no reported npm audit findings.

## [2.0.0] — 2026-09-07

### Changed

- Target the MCP Description `0.8.0` schema and support reusable
  component references in the stable 2.x card-view release.

## [2.0.0-rc.1] — 2026-09-04

### Added

- Show compact, protocol-labelled capability summaries and per-tool execution and client requirements in card views, with extensions rendered as yellow badges.
- Show compact elicitation name and mode summaries on tools, resources,
  resource templates, and prompts.

### Changed

- Expand elicitation summaries into optional detail views for messages,
  conditions, form schemas or URLs, outcomes, and protocol scopes.
- Render all client capability requirements as compact path badges instead of
  JSON, and show protocol-version values as compact black-outlined bubbles.
- Provide an optional displayed-item index to custom badge renderers so hosts can identify duplicate protocol-scoped declarations.
- Accept reusable component references in tool `inputSchema` / `outputSchema`
  and declaration examples. Resolved references render identically to inline
  content; unresolved `$componentRef` values render as a compact reference
  indicator instead of raw JSON.
- Render MCP Description 0.8 root protocol versions and named
  `securitySchemes` in the shared card view.
- Render explicitly declared security requirements for the root, transports,
  tools, resources, resource templates, and prompts without inheritance.
- Align resource and prompt example sections with tool Input/Output sections and
  render prompt arguments as a collapsed table.
- Support opt-in, host-controlled protocol-version selection in the MCP
  Version(s) row for effective-view projections; the mode defaults to disabled.
- Add configurable named-example rendering: hidden by default, compact names,
  or expandable JSON details for embedding hosts, with optional selection
  callbacks for host-controlled navigation.


## [1.0.0] — 2026-07-07

First stable release. See [1.0.0-rc.1], [1.0.0-rc.2], and [1.0.0-rc.3] for the full change history.


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
