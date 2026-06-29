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
- **JSON Schema source of truth** — `src/core/mcpdesc-schema.json` is the schema copied from `ref/mcp-description/schemas/`. When the spec updates, copy the new schema here.
- **Handlebars template** — `src/core/template.ts` contains the markdown template as a TypeScript string. The renderer in `src/core/renderer.ts` registers helpers ported from mcp-contract.

### Spec Version

The editor currently targets **MCP Description v0.7.0**. The schema lives at `src/core/mcpdesc-schema.json`. Types in `src/core/types.ts` mirror the spec structure.

## Changelogs

This project maintains **two changelogs**. Both must be kept in sync when making changes.

| Changelog | Scope | Version tracks |
|-----------|-------|----------------|
| `CHANGELOG.md` (root) | The editor application (UI, state, examples, schema, validator) | `package.json` version (root) |
| `packages/mcpdesc-ui/CHANGELOG.md` | The standalone viewer library (McpDescCardView, TagFilterBar, McpDescUI, viewer.html) | `packages/mcpdesc-ui/package.json` version |

### Rules

1. **Determine affected scope** — if a change modifies files under `packages/mcpdesc-ui/`, update the mcpdesc-ui changelog. If a change modifies files under `src/`, update the root changelog. Many changes (e.g. to `McpDescCardView.tsx`) affect both.
2. **Update both changelogs** when a change touches shared code (the card view is imported by the editor from `packages/mcpdesc-ui/src/`).
3. **Format** — follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Use `### Added`, `### Changed`, `### Removed`, `### Fixed`, `### Breaking` sections.
4. **Version bumps** — when adding a changelog entry for a new version:
   - Bump `version` in the corresponding `package.json`
   - For mcpdesc-ui, also update the `version` constant in `packages/mcpdesc-ui/src/index.tsx`
   - Root changelog has a TOC between `<!-- toc -->` / `<!-- tocstop -->` markers — add the new entry link there
5. **Unreleased section** — both changelogs have an `## unreleased` section at the top for work-in-progress entries.

## Build & Run

```bash
npm install
npm run dev      # Vite dev server on :5173
npm run build    # Production build → dist/
```

## Testing

No test framework is configured yet. When adding tests:
- Unit tests for `src/core/` (validator, renderer) — these are pure functions, easy to test with Vitest.
- Component tests for preview rendering — use React Testing Library.

## Common Tasks

### Update the MCP Description schema
1. Copy the new schema from `ref/mcp-description/schemas/<version>/mcp-description.schema.json` to `src/core/mcpdesc-schema.json`
2. Update types in `src/core/types.ts` to match
3. Update the spec version reference in `src/core/template.ts` and `src/examples/index.ts`

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
