# Changelog

All notable changes to the MCP Description Editor are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/).

<!-- Update me with: `markdown-toc -i CHANGELOG.md --maxdepth 2` -->

<!-- toc -->

- [Unreleased](#unreleased)
- [[1.0.0] — 2026-07-07](#100--2026-07-07)
- [[1.0.0-rc.3] — 2026-07-07](#100-rc3--2026-07-07)
- [[1.0.0-rc.2] — 2026-07-06](#100-rc2--2026-07-06)
- [[1.0.0-rc.1] — 2026-06-27](#100-rc1--2026-06-27)

<!-- tocstop -->

## Unreleased


## [1.0.0] — 2026-07-07

First stable release. 


## [1.0.0-rc.3] — 2026-07-07

### Added

- ESLint flat config (`eslint.config.js`) — `npm run lint` now passes and is included in the `prerelease` gate.
- `scripts/sync-badge.mjs` — syncs the README status badge to the current `package.json` version (pre-release → orange, stable → brightgreen). Wired as `npm run sync:badge`, prepended to `prerelease`.
- `npm run build:viewer` and `npm run verify:lockfile` scripts for convenience and the gate.
- GitHub icon link in the bottom-right status bar, linking to the source repository.
- `.github/skills/release/SKILL.md` — the release skill was missing from the repo despite being referenced by the release-manager agent; added with monorepo-specific steps.

### Changed

- README: expanded Quick Start guide with sections for examples, loading documents, validating, and exporting. Added card-view component quick start (script-tag and React).
- README: promoted editor as the primary artifact; viewer demoted to a secondary paragraph. Added License, Status, and TypeScript badges.
- CI: replaced the Node.js version matrix (`20.x`/`22.x`/`24.x`) with a single LTS build (`22.x`) — this repo produces browser bundles; no Node.js runtime API is exercised.
- Default editor content on first load changed from a hardcoded `0.6.0` JSON stub to the bundled `minimal.yaml` example (`0.7.0`).
- Version display removed from the top-left toolbar brand; version shown only in the bottom-right status bar.
- Moved `demo/viewer.html` (local viewer test page) from the root-level `mcptoolkit-viewer/` folder to `demo/` to avoid confusion with the `packages/mcptoolkit-viewer/` package directory.


## [1.0.0-rc.2] — 2026-07-06

### Changed

- Renamed the editor repository/package `mcpdesc-editor` → `mcptoolkit-editor` (repo `cisco-open/mcptoolkit-editor`), aligning it with the MCP Toolkit suite. The product is named **MCP Description Editor** (shortened to *Editor*).
- Renamed the standalone viewer package `mcpdesc-ui` → `@cisco_open/mcptoolkit-viewer` (directory `packages/mcptoolkit-viewer/`). The editor now imports the card view from the renamed package.
- MCP Description schema and spec references now point to the [`cisco-open/mcptoolkit-contract`](https://github.com/cisco-open/mcptoolkit-contract) repository, the source of the MCP Description format.

### Added

- Distribution model documentation: the editor is hosted as a static site and the viewer is published to npm. See `docs/maintainers/distribution.md` and the Distribution section of the README.
- "MCP Description format" section in the README describing the format and linking to its source in `cisco-open/mcptoolkit-contract`.


## [1.0.0-rc.1] — 2026-06-27

### Added

Initial open-source release.

- **Monaco-based editor** with JSON Schema-driven autocomplete, inline validation, folding, and syntax highlighting for JSON and YAML
- **Real-time validation** — AJV schema validation against MCP Description plus semantic warnings (semver, empty capabilities, duplicate names, unassigned tags)
- **Structured Cards preview** — collapsible sections for server info, transports, security, capabilities, tools, resources, resource templates, prompts, and tags
- **Click-to-navigate** from preview bubbles to their definition in the editor
- **Markdown preview** rendered via Handlebars
- **JSON ↔ YAML** conversion with format auto-detection
- **Export** to `.mcpdesc.json`, `.mcpdesc.yaml`, or `.md`, plus file import and LocalStorage persistence
- **Bundled examples** driven by `examples/config.yaml`
- **Pure client-side** — no backend required
