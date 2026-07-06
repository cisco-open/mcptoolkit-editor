# Changelog

All notable changes to the MCP Description Editor are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/).


## Unreleased


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
