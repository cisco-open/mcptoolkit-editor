# Agent Guide

Use this file to route changes and preserve repository invariants. Product usage,
embedding examples, and the architectural overview belong in [README.md](README.md).
PR and DCO policy lives in [CONTRIBUTING.md](CONTRIBUTING.md).

## Change Routing

The editor is a pure browser application. Start at the owning module below and
extend its nearby tests rather than introducing a second implementation.

| Change | Owning files and boundaries |
| --- | --- |
| Source text, parsing, validation scheduling, saved content, protocol selection | [src/hooks/useDoc.tsx](src/hooks/useDoc.tsx). React Context and reducer own document state; parse/validate is debounced at 300ms. |
| Validation policy, selectors, diagnostic normalization | [src/core/validator.ts](src/core/validator.ts), [src/core/types.ts](src/core/types.ts). Delegate structural/semantic checks to `@mcpdesc/validator/browser`. |
| Legacy migration or RC conversion | [src/core/conversion.ts](src/core/conversion.ts), [src/hooks/useDoc.tsx](src/hooks/useDoc.tsx), [src/components/MigrationDialog.tsx](src/components/MigrationDialog.tsx), [src/components/MigrationStatus.tsx](src/components/MigrationStatus.tsx), [src/components/ConversionDialog.tsx](src/components/ConversionDialog.tsx). Core performs transformations; the editor owns consent, review, and source replacement. |
| Monaco behavior and source navigation | [src/components/Editor.tsx](src/components/Editor.tsx), [src/components/editorDiagnostics.ts](src/components/editorDiagnostics.ts), [src/components/componentNavigation.ts](src/components/componentNavigation.ts), [src/components/preview/navigation.ts](src/components/preview/navigation.ts). |
| Validation table presentation, filtering, sorting, sizing | [src/components/ValidationPanel.tsx](src/components/ValidationPanel.tsx). Consume validator output; do not implement validation rules here. |
| Document import, examples, and source URLs | [src/components/ImportDialog.tsx](src/components/ImportDialog.tsx), [src/importDocument.ts](src/importDocument.ts), [src/editorUrl.ts](src/editorUrl.ts). |
| Document and native export | [src/components/Toolbar.tsx](src/components/Toolbar.tsx), [src/components/ExportMenu.tsx](src/components/ExportMenu.tsx), [src/components/NativeExportDialog.tsx](src/components/NativeExportDialog.tsx), [src/nativeExport.ts](src/nativeExport.ts). Keep projection, filenames, and downloads shared across entry points. |
| Preview layout and editor-specific card actions | [src/components/preview/PreviewPanel.tsx](src/components/preview/PreviewPanel.tsx), [src/components/preview/CardView.tsx](src/components/preview/CardView.tsx), [src/components/SplitPane.tsx](src/components/SplitPane.tsx). Cards are the permanent preview, not one of several tabs. |
| Shared card rendering or viewer API | [packages/mcptoolkit-viewer/src/McpDescCardView.tsx](packages/mcptoolkit-viewer/src/McpDescCardView.tsx), [packages/mcptoolkit-viewer/src/react.ts](packages/mcptoolkit-viewer/src/react.ts), [packages/mcptoolkit-viewer/src/index.tsx](packages/mcptoolkit-viewer/src/index.tsx). Editor integration uses optional host callbacks; standalone defaults must remain usable. |
| Markdown output | [src/core/renderer.ts](src/core/renderer.ts), [src/core/template.ts](src/core/template.ts). Markdown is an export, not an active preview tab. |
| Bundled examples | [examples/config.yaml](examples/config.yaml), YAML documents under [examples/features](examples/features/) and [examples/vendors](examples/vendors/), loader [src/examples/index.ts](src/examples/index.ts). Add a file and config entry; do not hardcode document strings in the loader. |
| App composition and embedded editor options | [src/App.tsx](src/App.tsx), [src/main.tsx](src/main.tsx), [src/editorOptions.ts](src/editorOptions.ts), [demo/editor.html](demo/editor.html). |

## Invariants

- Keep runtime code browser-compatible. In particular, [src/core](src/core/) has
  no React/DOM or Node.js dependencies. Build-time Node code belongs in scripts.
- Preserve strict CSP: no runtime `eval` or `new Function`. Monaco assets and
  workers are self-hosted through [src/monaco-setup.ts](src/monaco-setup.ts).
- Active validation comes from the external browser-safe validator. Monaco's
  local schemas supply completion; its schema validation is disabled to avoid
  contradictory errors. Do not add a competing AJV validator to the UI.
- Stable 0.8 documents follow the validator's maintained default selector;
  `mcpdesc: 0.9.0` explicitly selects `0.9.0-rc.1`. Do not treat unknown format
  versions as 0.8 or silently migrate documents during export.
- RC conversion must emit `mcpdesc: 0.9.0` and retain the explicit RC.1 `$schema`
  until final-release support is deliberately introduced. Apply blocker fixes
  only with author consent; never guess moves into `_meta` or `x-*`.
- Convert the latest raw source, not a stale debounced parse. Conversion must
  preserve field order; the installed core canonical serializer sorts keys, so
  do not replace the current order-preserving serialization without checking
  the library API and regression tests.
- Keep authored source separate from derived views. Project the Effective
  Protocol View before resolving component references. JSON/YAML exports keep
  authored references; Markdown uses the resolved view. Native projection uses
  core and must fail closed rather than exporting source as a fallback.
- Navigation and per-entry actions must distinguish declarations with the same
  identifier but different protocol scopes; use the existing path helpers.
- Keep diagnostic errors/warnings separate from per-rule result statuses.
  Retain rule identity and protocol context. Never count `not-applicable`,
  `not-evaluated`, or delegated checks as passes.
- Shared viewer controls are opt-in. Keep editor context, file downloads, and
  Monaco dependencies out of the viewer's rendering component.
- Use Tailwind utilities and existing component styles. Editor chrome/Monaco
  are dark, card previews are light, and the standalone viewer exposes theme
  options. Use the existing Lucide dependency for new control icons.

## Generated Assets

| Asset | Purpose and update path |
| --- | --- |
| [src/core/mcpdesc-schema.json](src/core/mcpdesc-schema.json) | Vendored 0.8 schema for completion and allowed-value hints; not the active validation implementation. |
| [src/core/mcpdesc-schema-0.9.0-rc.1.json](src/core/mcpdesc-schema-0.9.0-rc.1.json) | Refresh with `npm run sync:rc-schema` from the exact installed validator snapshot; the script checks its hash and schema identity. |
| [src/core/rule-titles.generated.json](src/core/rule-titles.generated.json) | Refresh with `npm run sync:rule-titles`; the pinned RC.1 manifest supplies the catalog digest and rule count. Keep catalog-derived titles out of handwritten UI maps. |
| [src/core/validator.generated.js](src/core/validator.generated.js) and [src/core/validator.generated.d.ts](src/core/validator.generated.d.ts) | Committed 0.7 validator used only to gate legacy migration. Preserve this format boundary. |

The sync commands are explicit maintenance steps, not dev/build hooks. Commit
their generated outputs with dependency or snapshot updates, and keep selectors,
schema identities, title metadata, and [src/core/types.ts](src/core/types.ts) aligned.

**Legacy generator warning:** [scripts/build-validator.mjs](scripts/build-validator.mjs)
is not wired into the current npm scripts or Vite build. Its comments still
describe obsolete hooks, and it reads the current 0.8 schema. Running it as-is
would overwrite the 0.7 migration validator with the wrong format. Verify the
intended legacy input and migration tests before changing that artifact.

## Verification

Read available commands from [package.json](package.json). Run the narrowest
check for the changed behavior first, then the required affected build/gate.

| Check | Command |
| --- | --- |
| Focused tests | `npm test -- <path/to/test>` |
| Full tests / watch | `npm test` / `npm run test:watch` |
| Application types / lint | `npx tsc -b` / `npm run lint` |
| Editor / viewer build | `npm run build` / `npm run build:viewer` |
| Final integration gate | `npm run release:check` |

`release:check` verifies release metadata, runs lint/tests, builds and packages
editor-dist, smoke-tests its entry assets, and builds the viewer when affected.
It does not prepare versions; `prerelease` is an alias for this check.

- Vitest uses jsdom. Keep unit/component tests beside source; component tests
  use React Testing Library. Shared raw fixtures live in
  [src/core/__fixtures__](src/core/__fixtures__/).
- Browser operations that must meet strict CSP need code-generation trap
  coverage; extend [src/core/components.csp.test.ts](src/core/components.csp.test.ts).
- jsdom needs test-only `HTMLDialogElement.showModal`/`close` implementations.
  Reuse the setup in [src/hooks/useDoc.test.tsx](src/hooks/useDoc.test.tsx).
- Jest-DOM matchers are not installed; use native DOM properties/attributes.
  Testing Library role queries do not accept Playwright's `exact` option.
- `tsc -b` excludes test files. Check test-file diagnostics as well as running
  tests; Vitest alone does not typecheck assertions.
- For UI changes, check actual desktop/mobile interaction and layout, not only
  rendered markup. Reuse an existing development server when available.

## Workflow and Package Scope

All changes, including docs, go through a branch and PR, never directly onto
`main`. Continue on the user's selected branch, preserve existing work, use DCO
sign-off for requested commits, and confirm before pushing. Follow
[CONTRIBUTING.md](CONTRIBUTING.md) for the contribution policy.

Use Unreleased entries for work in progress, without bumping versions unless
preparing a requested release. Follow the existing Keep a Changelog categories.

| Changelog | Update when |
| --- | --- |
| [CHANGELOG.md](CHANGELOG.md) | Editor app, state, examples, core, or editor-facing shared behavior changes. |
| [packages/mcptoolkit-viewer/CHANGELOG.md](packages/mcptoolkit-viewer/CHANGELOG.md) | Viewer or shared core/card behavior changes; update both app and viewer changelogs for shared changes. |
| [packages/mcptoolkit-editor-dist/CHANGELOG.md](packages/mcptoolkit-editor-dist/CHANGELOG.md) | Preparing an editor-dist release. |

Editor-dist must mirror the root app version; the viewer versions independently.
For a release, use the [release skill](.github/skills/release/SKILL.md) and
[distribution guide](docs/maintainers/distribution.md), including the matching
`release/X.Y.Z` branch and `release:prepare` before `release:check`. Do not create
tags or publish as a side effect of a feature change.

## Documentation Ownership

- [README.md](README.md): using and embedding the products, supported formats,
  and a high-level architecture overview.
- This file: where to change code, invariants, generated assets, tests, and
  agent-specific workflow. Link to usage instructions rather than copying them.
- [docs/README.md](docs/README.md): documentation index;
  [docs/maintainers](docs/maintainers/) holds detailed design/distribution notes.
  Archived material is not a source of current implementation instructions.
