# Changelog

All notable changes to the MCP Description Editor are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/).


## [1.0.0-rc1] — 2026-06-27

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
