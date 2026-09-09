# Changelog — MCP Description Editor

Changes to the **editor app** (`mcptoolkit-editor`) and its prebuilt
[`@cisco_open/mcptoolkit-editor-dist`](packages/mcptoolkit-editor-dist/CHANGELOG.md)
bundle (same version). The **viewer** is separate:
[`@cisco_open/mcptoolkit-viewer`](packages/mcptoolkit-viewer/CHANGELOG.md) has
its own changelog and version.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/).

<!-- Update me with: `markdown-toc -i CHANGELOG.md --maxdepth 2` -->

<!-- toc -->

- [Unreleased](#unreleased)
- [[2.1.2] — 2026-09-09](#212--2026-09-09)
- [[2.1.1] — 2026-09-08](#211--2026-09-08)
- [[2.1.0] — 2026-09-08](#210--2026-09-08)
- [[2.0.1] — 2026-09-07](#201--2026-09-07)
- [[2.0.0] — 2026-09-07](#200--2026-09-07)
- [[2.0.0-rc.1] — 2026-09-04](#200-rc1--2026-09-04)
- [[1.1.0-rc.2] — 2026-07-08](#110-rc2--2026-07-08)
- [[1.0.1] — 2026-07-07](#101--2026-07-07)
- [[1.0.0] — 2026-07-07](#100--2026-07-07)
- [[1.0.0-rc.3] — 2026-07-07](#100-rc3--2026-07-07)
- [[1.0.0-rc.2] — 2026-07-06](#100-rc2--2026-07-06)
- [[1.0.0-rc.1] — 2026-06-27](#100-rc1--2026-06-27)

<!-- tocstop -->

## Unreleased

## [2.1.2] — 2026-09-09

### Fixed

- Keep editor source query parameters in sync when selecting examples, importing documents, or editing loaded content without retaining manually entered import URLs.
- Recover the preview after invalid content is fixed or replaced with an example, and show a neutral no-content state when the editor contains only whitespace.

## [2.1.1] — 2026-09-08

### Added

- Add an editor component `title` option while retaining `MCP Description Editor` as the default toolbar title.

## [2.1.0] — 2026-09-08

### Added

- Support loading bundled examples through stable, explicitly configured IDs using the `?example=<id>` URL parameter.
- Add a unified file and public HTTPS URL import dialog, with automatic remote
  imports through the `?url=<encoded-url>` parameter.

### Changed

- Refine protocol version displays with crisp custom radios, consistent light
  backgrounds, and more compact labels.
- Give the import dialog a consistent dark palette, AA text contrast, and
  visible keyboard focus states without the browser's light file-input chrome.

### Security

- Sanitize description Markdown before rendering imported documents as HTML.

## [2.0.1] — 2026-09-07

### Changed

- Make the `main` 2.x and `v1/main` maintenance support policy prominent in the
  README and refresh its editor screenshot for MCP Description 0.8.

### Security

- Update transitive dependencies to resolve all reported npm audit findings in
  `brace-expansion`, `browserslist`, `fast-uri`, `js-yaml`, `nanoid`, and
  `postcss`.

## [2.0.0] — 2026-09-07

### Fixed

- Show error and warning glyphs together when both severities occur on the
  same editor line, while retaining severity-specific hover details and line
  highlighting.
- Support nested relative paths in the examples menu configuration and use its
  declared default example as the initial editor document.

### Changed

- Target MCP Description `0.8.0-rc.3` with `@mcpdesc/core@^0.9.1` and
  `@mcpdesc/validator@^0.10.1`. Pre-standard server extension maps on MCP 2025
  protocols are preserved and reported as warnings, demonstrated by the bundled
  Miro vendor example.
- Migrate legacy MCP Description 0.7 documents directly to the immutable RC.3
  snapshot using the native core converter.
- Bundle the Microsoft Learn MCP server as a vendor example.

## [2.0.0-rc.1] — 2026-09-04

### Added

- Show protocol-labelled capability summaries, tool execution behavior, and client requirements in the card preview, with extensions rendered as yellow badges so protocol projections expose contract differences.
- Show compact elicitation name and mode summaries on tools, resources,
  resource templates, and prompts.
- Add single- and multi-version MRTR elicitation examples.
- Add an advanced multi-version Tasks example demonstrating the migration from core Tasks execution to the Tasks extension.
- Resolve local `$componentRef` references via
  `@mcpdesc/core@0.7.0`. The card preview and Markdown export render resolved
  schemas and examples while the editor source keeps the authored references.
  Ctrl+clicking a reference in the editor navigates to its component definition.
- Bundle the `Reusable Components` example (vendored from the specification
  repo) demonstrating root `components` registries and local `$componentRef`
  references.
- Add a Vitest setup (`npm run test`) with valid and invalid component-reference
  fixtures covering every registry, chains, shared targets, missing targets,
  namespace errors, cycles, and strict-CSP resolution. `npm run prerelease` now
  runs the suite.
- Report MCP Description 0.7 migration outcomes as success, success with
  warnings, or failure, with a downloadable deterministic conversion report.
  Missing legacy protocol versions default to `2025-11-25` through the core
  converter and are reported as warnings.
- Render a lightweight named index for tool, resource, resource template,
  prompt, interaction, and completion examples in the editor card preview;
  selecting a name navigates Monaco to its source definition.
- Include up to ten allowed values in enum validation diagnostics and place
  parser diagnostics on their reported source line in Monaco.
- Restore a STDIO transport and sample tool in the bundled Minimal example.

### Fixed

- Navigate from projected operations to the exact parsed source node when names are duplicated across protocol versions.

### Changed

- Expand elicitation summaries into optional detail views for messages,
  conditions, form schemas or URLs, outcomes, and protocol scopes.
- Render all client capability requirements as compact path badges instead of
  JSON, and show protocol-version values as compact black-outlined bubbles.
- Upgrade to `@mcpdesc/core@^0.7.0` and `@mcpdesc/validator@^0.8.0`.
- Replace the untyped `components` placeholder with typed component registries
  and inline-or-reference unions for tool schemas and declaration examples.
- Target MCP Description `0.8.0-rc.1` using the CSP-safe
  `@mcpdesc/validator/standalone` and `@mcpdesc/core` packages. The editor now
  validates the full structural and semantic RC.1 contract.
- Update the editor schema, bundled examples, types, Monaco diagnostics, and
  preview for root protocol versions, protocol-scoped capabilities, and named
  security schemes. Multi-version documents can be viewed as an Effective
  Protocol View.
- Show explicit root and declaration-level security requirements in the card
  preview without inferring inherited security policy.
- Refresh the README and V2 support plan for the implemented RC.1 integration,
  current migration behavior, and deferred release work.
- Emphasize card-view MCP Versions values and reduce the Input, Output, and
  Arguments summary labels.
- Move opt-in multi-version effective-view selection into the MCP Versions
  row, default it to All versions, and demonstrate it with protocol-scoped
  tools in the bundled multi-version example.
- Prompt before migrating MCP Description 0.7 documents instead of converting
  them automatically. Cancelled and failed migrations preserve the original
  source and show an unsupported-version preview.


## [1.1.0-rc.2] — 2026-07-08

_Supersedes `v1.1.0-rc.1`, which misfired under the earlier tag scheme and was never published (tags are immutable, so we roll forward)._

### Changed

- Build with relative asset paths (Vite `base: './'`) so the prebuilt `dist/` can
  be served from any origin, subdomain, or subpath. Monaco's web workers still
  resolve correctly (via `import.meta.url`).
- **Per-package release tags.** The primary `@cisco_open/mcptoolkit-editor-dist`
  bundle publishes on the **default bare `v<version>`** tag (globbed `v[0-9]*` so
  it never catches viewer tags); the viewer publishes on `viewer-v<version>`. See
  [`docs/maintainers/distribution.md`](docs/maintainers/distribution.md#tag--version-convention).
- **`prerelease` now enforces editor-dist/root version alignment.** Added
  `npm run verify:versions` (fails if `@cisco_open/mcptoolkit-editor-dist` drifts
  from the root app version) as the first `prerelease` step, plus
  `npm run sync:version` to align them (`scripts/align-editor-dist-version.mjs`).
  The viewer keeps its independent version line.

### Added

- New workspace package **`@cisco_open/mcptoolkit-editor-dist`** — the prebuilt,
  host-neutral editor bundle (the `swagger-editor-dist` analog). Ships the
  compiled `dist/` so hosts can serve a portable editor without building from
  source. Published via a tag-driven workflow on `editor-dist-v*` tags. See
  [`docs/maintainers/distribution.md`](docs/maintainers/distribution.md).
- [`docs/maintainers/analytics.md`](docs/maintainers/analytics.md) — options and
  considerations for install-time and runtime analytics across the three
  artifacts. Current policy: **no telemetry by default**; the `-dist` package
  README documents this explicitly.


## [1.0.1] — 2026-07-07

### Fixed

- **Self-host Monaco Editor assets and workers.** The editor no longer loads Monaco from the jsdelivr CDN at runtime. `@monaco-editor/react`'s loader is now pointed at the bundled `monaco-editor` via `loader.config({ monaco })`, and Monaco's web workers (`editor.worker`, `json.worker`) are served from the app's own origin through `self.MonacoEnvironment`. This makes the editor work offline, behind a CDN block, and under a strict Content-Security-Policy. See `src/monaco-setup.ts`.
- **Precompile the AJV schema validator (strict-CSP safe).** `McpDescValidator` previously compiled `mcpdesc-schema.json` at runtime, which uses `new Function()` and threw `EvalError` under a strict CSP (crashing the app). The validator is now generated at build time into `src/core/validator.generated.js` by `scripts/build-validator.mjs` (AJV standalone codegen, wired into `npm run build`/`npm run dev` via `npm run build:validator`), so no runtime code evaluation occurs and validation works under `script-src 'self'`. **Opinionated choice (reconsiderable):** the generated file is **committed** to the repo so `tsc`, `npm run dev`, and the viewer build work without a codegen pre-step — see the design notes in `README.md` / `AGENTS.md`. The alternative (gitignore + prebuild hook) can be adopted later if this proves noisy.

### Added

- `public/_headers` — a host-neutral default Content-Security-Policy (plus `X-Content-Type-Options` and `Referrer-Policy`) honored by static hosts such as Cloudflare Pages and Netlify. Confirms the self-hosted editor runs with `default-src 'self'` and `worker-src 'self' blob:`.


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
