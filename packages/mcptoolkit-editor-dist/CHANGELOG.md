# Changelog — @cisco_open/mcptoolkit-editor-dist

Release notes for the prebuilt `@cisco_open/mcptoolkit-editor-dist` bundle. This
package ships the built **MCP Description Editor** app and **shares its version**,
so app-level changes are described in the [root `CHANGELOG.md`](../../CHANGELOG.md);
this file records the bundle's releases. The viewer has its own
[changelog](../mcptoolkit-viewer/CHANGELOG.md).

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This package uses [Semantic Versioning](https://semver.org/) and tracks the MCP Description Editor app version.

## [1.1.0-rc.1] — 2026-07-07

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
