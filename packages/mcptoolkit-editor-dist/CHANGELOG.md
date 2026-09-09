# Changelog — @cisco_open/mcptoolkit-editor-dist

Release notes for the prebuilt `@cisco_open/mcptoolkit-editor-dist` bundle. This
package ships the built **MCP Description Editor** app and **shares its version**,
so app-level changes are described in the [root `CHANGELOG.md`](../../CHANGELOG.md);
this file records the bundle's releases. The viewer has its own
[changelog](../mcptoolkit-viewer/CHANGELOG.md).

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This package uses [Semantic Versioning](https://semver.org/) and tracks the MCP Description Editor app version.

## Unreleased

## [2.2.0] — 2026-09-09

### Changed

- Ship stable MCP Description `0.8.0` validation, schema hints, examples, and
  automatic migration from 0.7 documents.

## [2.1.2] — 2026-09-09

### Fixed

- Ship the editor with reliable preview recovery after invalid or empty content
  and when replacing edited content with a bundled example.

## [2.1.1] — 2026-09-08

### Added

- Ship the editor with a configurable toolbar title while retaining `MCP
  Description Editor` as the default.

## [2.1.0] — 2026-09-08

### Added

- Ship the editor with URL-addressable examples and secure local-file or public
  HTTPS document imports.

### Security

- Limit imports to 1 MiB and sanitize rendered description Markdown.

## [2.0.1] — 2026-09-07

### Security

- Rebuild the editor bundle after updating transitive dependencies to patched
  versions with no reported npm audit findings.

## [2.0.0] — 2026-09-07

### Changed

- Ship the stable MCP Description Editor 2.0 release with MCP Description
  0.8.0 validation and automatic migration of 0.7 documents.

## [2.0.0-rc.1] — 2026-09-04

### Changed

- Ship the MCP Description Editor 2.0 release candidate with MCP Description
  0.8.0 validation, effective protocol views, and expanded card previews.

## [1.1.0-rc.2] — 2026-07-08

### Added

- Initial (release-candidate) release. Ships the prebuilt, host-neutral static
  build of the MCP Description Editor (`dist/`) so hosts can serve a portable
  editor without building from source — the swagger-editor-dist analog.
- Fully self-contained: Monaco Editor and its web workers are served from the
  bundle's own origin (no CDN), and all asset paths are relative (`base: './'`),
  so `dist/` can be served from any origin or subpath.
- **No telemetry:** no install-time analytics (no `postinstall`/Scarf beacon) and
  no runtime network calls of its own. See the README's *Privacy & analytics*
  section and [`docs/maintainers/analytics.md`](https://github.com/cisco-open/mcptoolkit-editor/blob/main/docs/maintainers/analytics.md).
