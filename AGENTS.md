# Agents Guide — MCP Description Editor

## Project Overview

This is a **pure client-side** web application for editing, validating, and visualizing MCP Description documents. It is built with React 18, TypeScript, Vite, Monaco Editor, and Tailwind CSS 4.

## Architecture

### Source Layout

- `src/core/` — Browser-compatible library with no React/DOM dependencies. Contains the validator (AJV), renderer (Handlebars), TypeScript types, and the MCP Description JSON schema. This module is designed to be extractable as a standalone package.
- `src/components/` — React UI components. `Editor.tsx` wraps Monaco, `preview/` contains the Cards and Markdown preview tabs, `ValidationPanel.tsx` shows errors/warnings, `Toolbar.tsx` handles file operations and export, `SplitPane.tsx` provides the resizable layout.
- `src/hooks/useDoc.tsx` — Central state management via React Context + `useReducer`. Owns the raw editor text, parsed document, format detection (JSON/YAML), and validation results. Debounces parse+validate at 300ms.
- `src/examples/` — Bundled example MCP Description documents (Blank, Minimal, HTTP Server).

### Documentation Layout

- `docs/` — End-user documentation at the docs root.
- `docs/maintainers/` — Maintainer-focused design and implementation references.
- `docs/dust/` — Archived planning and historical notes.
- `docs/img/` — Documentation images used by README and guides.

### Data Flow

1. User types in Monaco editor → `setText()` dispatches `SET_TEXT`
2. After 300ms debounce → `parseAndValidate()` runs:
   - Detects JSON vs YAML from leading character
   - Parses with `JSON.parse` or `yaml.parse`
   - Validates with `McpDescValidator` (AJV against `mcpdesc-schema.json`)
   - Adds semantic warnings
3. State updates trigger re-renders of preview and validation panels

### Key Conventions

- **No Node.js dependencies in `src/core/`** — everything must run in the browser. No `fs`, `path`, `child_process`, etc.
- **Tailwind utility classes** — no CSS Modules or CSS-in-JS. Use Tailwind v4 with `@import "tailwindcss"`.
- **Dark theme only** — all UI uses `bg-zinc-*` / `text-zinc-*` palette.
- **JSON Schema source of truth** — `src/core/mcpdesc-schema.json` is the schema vendored from the [mcptoolkit-contract](https://github.com/cisco-open/mcptoolkit-contract) repo (`schemas/mcp-description/`). When the spec updates, copy the new schema here.
- **Precompiled validator is committed (opinionated choice, reconsiderable)** — `src/core/validator.generated.js` is a build-time AJV standalone artifact generated from `mcpdesc-schema.json` by `scripts/build-validator.mjs`. We deliberately **commit** it (rather than gitignore it) so `tsc`, `npm run dev`, and the `packages/mcptoolkit-viewer` build all work without a mandatory codegen pre-step, and so the strict-CSP guarantee (no runtime `new Function()`) is visible in the tree. Trade-off: it can drift if the schema changes without regenerating — mitigated by `npm run build`/`dev` regenerating it via `build:validator`. If this proves noisy, the alternative is to gitignore the file and rely on a prebuild hook; revisit if needed.
- **Handlebars template** — `src/core/template.ts` contains the markdown template as a TypeScript string. The renderer in `src/core/renderer.ts` registers helpers ported from mcptoolkit-contract.

### Spec Version

The editor currently targets **MCP Description v0.7.0**. The schema lives at `src/core/mcpdesc-schema.json`. Types in `src/core/types.ts` mirror the spec structure.

## Changelogs

This project maintains **two changelogs**. Both must be kept in sync when making changes.

| Changelog | Scope | Version tracks |
|-----------|-------|----------------|
| `CHANGELOG.md` (root) | The editor application (UI, state, examples, schema, validator) | `package.json` version (root) |
| `packages/mcptoolkit-viewer/CHANGELOG.md` | The standalone viewer library `@cisco_open/mcptoolkit-viewer` (McpDescCardView, TagFilterBar, McpToolkitViewer, viewer.html) | `packages/mcptoolkit-viewer/package.json` version |

### Rules

1. **Determine affected scope** — if a change modifies files under `packages/mcptoolkit-viewer/`, update the mcptoolkit-viewer changelog. If a change modifies files under `src/`, update the root changelog. Many changes (e.g. to `McpDescCardView.tsx`) affect both.
2. **Update both changelogs** when a change touches shared code (the card view is imported by the editor from `packages/mcptoolkit-viewer/src/`).
3. **Format** — follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Use `### Added`, `### Changed`, `### Removed`, `### Fixed`, `### Breaking` sections.
4. **Version bumps** — when adding a changelog entry for a new version:
   - Bump `version` in the corresponding `package.json`
   - For mcptoolkit-viewer, also update the `version` constant in `packages/mcptoolkit-viewer/src/index.tsx`
   - Root changelog has a TOC between `<!-- toc -->` / `<!-- tocstop -->` markers — add the new entry link there
5. **Unreleased section** — both changelogs have an `## unreleased` section at the top for work-in-progress entries.

## Contributing workflow

All changes — code, docs, config, or release prep — must go through a **branch and pull request**. Never commit directly to `main`.

```bash
git switch -c <type>/short-description   # e.g. fix/default-example, chore/ci-simplify
# ... make changes, commit with -s (DCO sign-off) ...
git push -u origin <branch>
# open a PR against main; wait for CI and review before merging
```

Branch naming conventions:
- `fix/` — bug fixes
- `feat/` — new features
- `chore/` — tooling, CI, docs, deps
- `release/X.Y.Z` — release prep (required by the release workflow)

For agents: batch logically related changes into a single branch and PR rather than one commit per tweak. Stop before pushing and confirm with the user.

## Build & Run

```bash
npm install
npm run dev      # Vite dev server on :5173
npm run build    # Production build → dist/
```

## Releasing

The published artifact is the `@cisco_open/mcptoolkit-viewer` workspace; releases are tag-driven (`v*` tags trigger `.github/workflows/publish.yml`).

Before proposing a release PR, run the prerelease gate:

```bash
npm run prerelease
```

This runs `npm run sync:badge` (syncs the README status badge to the new version), `npm ci --dry-run` (verifies `package-lock.json` is in sync with the manifests), lints, and then builds both the editor and the viewer library. It mirrors the `npm ci` + lint + build path that CI and the publish workflow use.

Release checklist (see `.github/agents/release-manager.agent.md` and `.github/skills/release/SKILL.md` for the full procedure):

1. Bump `version` in `packages/mcptoolkit-viewer/package.json` (and the root `package.json` for suite alignment).
2. Update the `version` constant in `packages/mcptoolkit-viewer/src/index.tsx`.
3. Roll up **both** changelogs (see the Changelogs section above).
4. Run `npm install` so `package-lock.json` reflects the new versions, and commit it — otherwise `npm ci` fails in CI/publish.
5. Run `npm run prerelease` and confirm it is green.
6. Open a `release/X.Y.Z` PR; after merge, tag `vX.Y.Z` on `main` to publish. RC versions (`-rc.N`) publish under the `next` dist-tag; stable under `latest`.

## Testing

No test framework is configured yet. When adding tests:
- Unit tests for `src/core/` (validator, renderer) — these are pure functions, easy to test with Vitest.
- Component tests for preview rendering — use React Testing Library.

## Common Tasks

### Update the MCP Description schema
1. Copy the new schema from the [mcptoolkit-contract](https://github.com/cisco-open/mcptoolkit-contract) repo (`schemas/mcp-description/<version>/mcp-description.schema.json`) to `src/core/mcpdesc-schema.json`
2. Regenerate the precompiled validator: `npm run build:validator` (writes `src/core/validator.generated.js`). This runs automatically as part of `npm run build`/`npm run dev`, but regenerate and commit it when the schema changes. The validator is precompiled (AJV standalone) so it runs under a strict CSP without `new Function()`.
3. Update types in `src/core/types.ts` to match
4. Update the spec version reference in `src/core/template.ts` and `src/examples/index.ts`

### Add a new bundled example
1. Add the JSON string to `src/examples/index.ts`
2. Add an entry to the `examples` array with `name`, `label`, and `content`

### Add a new preview section
1. Create a component in `src/components/preview/` following the pattern in `CardView.tsx`
2. Add it to `CardView.tsx`'s default export or create a new tab in `PreviewPanel.tsx`

### Add a new export format
1. Add a handler in `src/components/Toolbar.tsx` following the `handleExportJSON` / `handleExportMarkdown` pattern
2. Add a button in the toolbar's export section

## Dependencies

Runtime dependencies are intentionally minimal:
- `react`, `react-dom` — UI framework
- `monaco-editor`, `@monaco-editor/react` — Code editor
- `ajv`, `ajv-formats` — JSON Schema validation
- `handlebars` — Template rendering
- `yaml` — YAML parsing/serialization

All validation and rendering runs client-side. There is no backend.
