# Changelog — mcpdesc-ui

All notable changes to mcpdesc-ui — the MCP Description Viewer — are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/).

<!-- toc -->

- [[1.0.0-rc1] — 2026-06-27](#100-rc1--2026-06-27)

<!-- tocstop -->

## [1.0.0-rc1] — 2026-06-27

### Added

Initial open-source release.

- Interactive card-view rendering of MCP Description documents
- Drop-in `<script>` tag usage via `McpDescUI()` and React component export via `mcpdesc-ui/react`
- `renderBadge` prop for pluggable badge rendering (e.g. click-to-navigate in the editor)
- Accepts `spec` (pre-parsed object) or `url` (fetch + auto-parse) inputs
- Light and dark themes
- Tag filter bar and validation panel
- Tailwind CSS scoped via the `.mcpdesc-ui-root` container selector
