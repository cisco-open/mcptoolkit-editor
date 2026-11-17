# Editor 3.0.0: 0.9.0-only editing with RC.3 diagnostics (historical)

> **Historical plan:** This records the RC.3 implementation decisions. The
> current editor uses stable MCP Description 0.9.0 with
> `@mcpdesc/core@0.13.0` and `@mcpdesc/validator@0.14.0`; consult `AGENTS.md`
> and the current changelog for active implementation guidance.

> **Status:** decisions D1–D3 approved (recommended options) and implemented on
> the working branch. Version bumps (editor 3.0.0, viewer 3.0.0) remain for the
> release step.

## Inputs evaluated

- Proposal 0035 (Located, Union-Aware Diagnostics), released as spec `0.9.0-rc.3`.
- `@mcpdesc/validator@0.14.0-rc.8`: RC.3 is the default for `mcpdesc: 0.9.0`.
  It adds format 1.4.0 `detail` and `relatedLocations` on every schema finding,
  located paths, selected-branch reduction and component-reference attribution.
  0.8 selectors are still shipped.
- `@mcpdesc/core@0.13.0-rc.7`: pins validator rc.8, so the editor bundles one
  copy. 0.8 → 0.9 conversion emits `$schema` 0.9.0-rc.3 by itself.

Scratch-directory checks, with no change to the repository:

| Check | Result |
| --- | --- |
| 9 `features` examples, converted then validated | All converted; valid under RC.3; 0 errors, 0 warnings |
| 3 `vendors` examples | All convert. `miro` has 1 RC.3 warning after conversion. |
| Invalid 0.8 source (`arg`) | `invalid-source` with a single `mcpdesc.conversion.source-valid` finding. It gives no details. |
| RC.3 `typ` case | 2 findings: `missing-member type` at `/transports/0` with `allowedValues`, and `unexpected-member typ` at `/transports/0/typ` with `allowedMembers` |

Remaining limitation: `message` still reads "does not validate against 0.9.0:
… must NOT have additional properties". The editor should render from
`detail.kind`.

## Phases

### 1. Dependencies and generated assets

- Upgrade `@mcpdesc/core` to `0.13.0-rc.7` and `@mcpdesc/validator` to
  `0.14.0-rc.8`, and confirm a single deduplicated validator copy.
- Update `scripts/sync-rc-schema.mjs` to target RC.3, then refresh
  `src/core/mcpdesc-schema-0.9.0-rc.3.json` and delete the RC.2 copy.
- Refresh `rule-titles.generated.json` (`npm run sync:rule-titles`) from the
  RC.3 manifest.
- Delete `src/core/mcpdesc-schema.json` (0.8).

### 2. Validation adapter (`src/core/validator.ts`, `types.ts`)

- Validate 0.9.0 documents only. Remove the 0.8 constants and the schema
  switch. Export `MCPDESC_SPECIFICATION = V0_9_RC_3_SPECIFICATION` and its
  schema URI.
- Map each diagnostic into `ValidationIssue`, keeping `detail` and
  `relatedLocations` as typed optional fields. The raw `message` stays as
  `rawMessage`.
- Remove `enumValuesAtPath` and the "Allowed values:" suffix. `allowedValues`
  now comes from `detail`.
- `mcpdesc` type: `'0.9.0' | string`.

### 3. Shared diagnostic formatter (`src/core/diagnosticMessage.ts`, new)

- One template per `detail.kind`:
  - `missing-member`: "Missing required member `type`. Allowed values: …"
  - `unexpected-member`: "Unexpected member `typ`. Allowed members: …"
    - Append "for `type: stdio`" when `selector` is present.
  - `invalid-member-name`
  - `invalid-value`: shows `allowedValues`.
  - `invalid-type`: shows `expectedTypes`.
  - `conflicting-members`: "`text` and `blob` cannot be used together".
  - `missing-alternative`: "Provide at least one of …".
  - `constraint`: shows `keyword` and `limit`.
- Unknown kinds or no `detail`: fall back to `message` (format rule).
- Facts only, no fix suggestions.
- Pure and browser-safe. The editor panel, Monaco markers and gutter, and the
  standalone viewer all use it.

### 4. Navigation (item 1, kept as a safety net)

- Validation paths now always resolve, so validation markers and the panel use
  only AST lookup (`sourcePathToLine`).
- If a path does not resolve, use the nearest existing parent in the
  YAML/JSON tree. Never use text search.
- Keep the text search in `componentNavigation` only for component-definition
  navigation, where it is still needed.
- `relatedLocations` (`component-definition`): add a secondary "Defined at
  `/components/…`" link in the finding row that reveals the component line.
  The marker stays at the use site.

### 5. Validation panel (editor and viewer)

- Each finding shows:
  - the formatted message;
  - a path link;
  - an optional component-definition link;
  - an expandable "Validator details" section with the raw message, `code`
    and `detail` facts.
- Search covers the formatted message, the raw message and `detail.member`.
- No other change to rule grouping, statuses and the protocol filter. Rule
  attribution improves upstream (unselected-alternative rules no longer fail).

### 6. 0.8 → 0.9 migration on load (replaces the toolbar conversion)

The flow mirrors the current 0.7 experience.

- `useDoc.parseAndValidate`: when `mcpdesc` is `0.8.0`:
  - set `doc = null` and show a single "MCP Description 0.8 is no longer
    supported; migrate to 0.9.0" finding;
  - dispatch `REQUEST_CONVERSION` once per source text, remembering a cancel.
- Covers every entry point: initial localStorage content, typing or pasting,
  Import (file, URL, `?url=`), and vendor examples.
- Reuse `ConversionDialog` (consent, blocker review with author-approved fixes,
  report download), retitled "Migrate to MCP Description 0.9.0 (RC.3)". Remove
  the toolbar "Migrate to 0.9 RC.2" button.
- `src/core/conversion.ts`: remove the `$schema` override wrapper; core emits
  RC.3. Keep `conversionFixes`, revalidated against RC.3 conversion rules.
- Order: convert the latest raw source, preserving field order.
- Invalid 0.8 source (`invalid-source`): show the finding and keep the original
  text unchanged. Decision D1 below covers whether to list why.
- After success, show a status chip "Migrated to 0.9.0" with warning count and
  report download, replacing "Migrated to 0.8".
- Preview and exports are disabled while a 0.8 document is unconverted, as for
  0.7 today.

### 7. 0.7 and earlier

See decision D2. Either way, remove `MigrationDialog`/`MigrationStatus` 0.8
wording, `LEGACY_MIGRATION_ERROR`, and the `keyOrder: 'sorted'` 0.7 path if
it is no longer needed.

### 8. Monaco (`Editor.tsx`)

- Register the RC.3 schema only, for completion and hover. Keep schema
  validation disabled.
- Remove the `rc ? … : …` file-match switch.

### 9. Examples

- Convert the 9 `examples/features/*.yaml` files with core rc.7 (`keyOrder`
  preserving authored order) and commit them as `mcpdesc: 0.9.0` with
  `$schema` RC.3. Each must validate with 0 errors.
- Leave `examples/vendors/*` at 0.8.0. Loading one triggers the migration
  prompt, which is the test path. In the Examples menu, label them "(0.8 —
  migration demo)".
- Update `examples/config.yaml` metadata if it records versions. Update the
  example and default-document tests.

### 10. Dead code removal

- `src/core/mcpdesc-schema.json`
- RC.2 schema
- `validator.generated.js` and `.d.ts`, and `scripts/build-validator.mjs`, if
  D2 drops 0.7
- 0.8 constants and selector branches
- `enumValuesAtPath`
- the toolbar conversion button
- 0.8-only tests and fixtures (`src/core/__fixtures__`), with remaining ones
  migrated to 0.9
- Viewer: `index.tsx` stops loading the 0.8 schema (see D3)
- AGENTS.md "Generated Assets" and "Invariants" sections (0.8 default
  selector, 0.7 gate, legacy generator warning)

### 11. Tests

- Adapter: the RC.3 `typ`, `arg`, inline-example, `text`+`blob`,
  `oauthFlows` and component-reference cases map `detail` and
  `relatedLocations`.
- Formatter: one test per kind, plus unknown-kind fallback.
- Navigation: a missing path anchors to its parent; no text search;
  component-definition link; YAML and JSON.
- `useDoc`:
  - 0.8 detection on initial load, set text, import and example;
  - a cancel is remembered;
  - success replaces the text and validates under RC.3;
  - `invalid-source` leaves the text unchanged;
  - 0.7 behaviour per D2.
- Examples: every `features` example is valid under RC.3, every `vendors`
  example is 0.8 and converts.
- Keep the CSP trap test covering conversion and validation.
- Type-check test files separately: `tsc -b` excludes them.

### 12. Docs, versions, verification

- README: supported formats are 0.9.0 (RC.3 until final). 0.8 documents are
  migrated on load. Editor 2.x is the last line with 0.8 editing.
- CHANGELOG Unreleased, with **Removed** / **Changed** / **Added** entries.
- Viewer CHANGELOG.
- Version bump only at release time: editor and editor-dist `3.0.0`; viewer per
  D3.
- Verification:
  - focused tests, then `npm test`, `npx tsc -b`, `npm run lint`;
  - `npm run build`, `npm run build:viewer`;
  - `npm run release:check`;
  - desktop and mobile browser checks of the migration prompt, the `typ` case
    (line 18 marker), and the component-definition link.
  - Use an isolated dev server; do not touch the shared 5173 tab state.

## Decisions (approved)

- **D1, invalid 0.8 source — approved: list the problems.** Core returns only "source not valid".
  - Recommended: in the migration dialog only, list the 0.8 findings by calling
    the validator's existing 0.8 selector, with line links, so authors can fix
    them before migrating. There is no 0.8 validation panel and no 0.8 code
    beyond one selector call.
  - Alternative: show only the generic message.
- **D2, 0.7 documents — approved: drop 0.7 and point to editor v2.2.2**, the
  latest 2.x release supporting 0.8.
  - Recommended: drop 0.7. Show "MCP Description 0.7 is not supported; use
    editor 2.x to migrate to 0.8 first", and remove the generated 0.7
    validator and the 0.7 → 0.8 path.
  - Alternative: chain 0.7 → 0.8 → 0.9 in one consent, which keeps the
    generated 0.7 validator.
- **D3, standalone viewer — approved: viewer 3.0.0, 0.9.0 only.** It shares the adapter.
  - Recommended: the viewer also validates 0.9.0 only, and shows "0.8 is not
    supported; migrate with the editor" for 0.8 input. This is viewer `3.0.0`.
  - Alternative: the viewer keeps rendering 0.8 cards without validation.
