# mcpdesc-ui: Standalone Card View Rendering — Options & Arbitration

> **Goal:** Provide both (a) a CLI-generated static HTML card view via `mcpcontract` and (b) a standalone `mcpdesc-ui` JS bundle for interactive browser embedding — analogous to what [Swagger UI](https://github.com/swagger-api/swagger-ui) is to the Swagger Editor.

---

## Context

### What We Have Today

| Asset | Location | Description |
|-------|----------|-------------|
| **mcpcontract CLI** | `ref/mcp-contract/` | Node.js CLI with 13 commands. `mcpcontract document` already generates **markdown** from mcpdesc files using Handlebars templates. Has 30+ registered helpers, 5 built-in `.md.hbs` templates, and a renderer that already supports `.html.hbs` templates (enables HTML escaping). |
| **mcpcontract templates** | `ref/mcp-contract/templates/` | `default-dump.md.hbs` (detailed), `reference-dump.md.hbs` (concise), `registry-ready.md.hbs`, plus changelog templates. No HTML template exists yet. |
| **CardView** | `src/components/preview/CardView.tsx` | ~500-line React component. Uses Tailwind utility classes, `marked` for description rendering, `useDoc` hook for editor navigation. Renders `McpDescDocument` → interactive JSX cards. |
| **Editor core library** | `src/core/` | Browser-compatible module: AJV validator, Handlebars markdown renderer (ported from mcp-contract), TypeScript types, JSON Schema. |
| **Editor Handlebars template** | `src/core/template.ts` | Simplified Markdown template for the editor's "Markdown" preview tab. A browser-compatible subset of mcp-contract's `default-dump.md.hbs`. |
| **Editor app** | `src/App.tsx` | Full Vite+React+Monaco SPA. Runtime deps: React, Monaco, AJV, Handlebars, YAML, marked. |

### Key Observations

1. **The CardView and the Handlebars renderer are two entirely different pipelines.** The card view is React + Tailwind (interactive HTML); the markdown renderer is Handlebars (flat text). Neither can trivially produce the other's output.

2. **`mcpcontract document` already generates Markdown from mcpdesc files.** The editor's `src/core/renderer.ts` is explicitly "adapted from mcp-contract's Renderer class" — a browser port with a subset of helpers. The editor also has its own simplified template (`src/core/template.ts`), separate from mcp-contract's `default-dump.md.hbs`.

3. **mcpcontract's renderer already supports `.html.hbs` extensions** (enables HTML escaping for safety). Adding a static HTML card template requires **zero changes** to the renderer engine — just a new template file.

4. **There is template duplication today.** The editor's Markdown preview tab uses its own Handlebars template, separate from mcp-contract's templates. This creates a maintenance surface.

---

## Markdown Template: Source of Truth

### Decision: mcpcontract is the source of truth

`mcpcontract document` already ships mature Markdown templates (`mcpdesc-documentation`, `reference-documentation`) with 30+ helpers. The editor's `src/core/template.ts` is a simplified derivative.

**Why mcpcontract, not the editor:**
- mcpcontract is the **official CLI tool** — its output is what CI pipelines, READMEs, and registries consume.
- It has richer Handlebars helpers (schema constraint formatting, table escaping, changelog icons) that the editor subset lacks.
- The editor template was explicitly "adapted from mcp-contract" — the dependency direction is already established.
- Keeping the CLI as source of truth means `mcpcontract document` output and the editor's Markdown preview stay in sync.

**Migration path for the editor:**
- The editor's `src/core/template.ts` should be replaced with a copy of mcp-contract's `default-dump.md.hbs` (or a version that the editor loads at build time via Vite raw import).
- Missing helpers in the editor's `src/core/renderer.ts` need to be ported from mcp-contract (e.g., `tableBr`, `firstSentence`, `formatNumberConstraints`).
- This is a separate task but eliminates the template duplication debt.

---

## Options

### Option 1 — Static HTML via mcpcontract (Handlebars `.html.hbs` template)

**Approach:** Add a new Handlebars template (`card-view.html.hbs`) to mcpcontract that produces a self-contained HTML page mimicking the card layout. Users run:

```bash
mcpcontract document spec.yaml --template card-view --output spec.html
```

No new CLI command needed — the existing `document` command already supports custom templates and auto-detects `.html.hbs` extensions.

**Deliverables:**
- `ref/mcp-contract/templates/card-view.html.hbs` — Handlebars template producing a full HTML page with inline `<style>` CSS
- Register in mcpcontract's template mapping as `card-view`
- Optional: bash one-liner wrapper `bin/mcpdesc-html.sh`

**What the template produces:**
- Self-contained single HTML file (no external dependencies)
- Card layout with `<details>` for collapsible sections
- Schema tables, badges, type pills — all in inline CSS
- Markdown descriptions rendered server-side via a `markdown` Handlebars helper (using `marked`)

**Technical notes:**
- mcpcontract's renderer already sets `noEscape: false` for `.html.hbs` — HTML entities are escaped by default, safe against XSS.
- A new `markdown` helper needs to be registered in mcpcontract's renderer to convert description fields to HTML inline.
- Schema constraint helpers (`formatNumberConstraints`, etc.) already exist — just need to emit HTML instead of Markdown table syntax.

| Pros | Cons |
|------|------|
| **Zero new tooling** — uses existing `mcpcontract document` command | Two visual renderers to maintain (Handlebars HTML ≠ React CardView) |
| Zero client-side JS — pure HTML+CSS output | Approximate fidelity with editor's CardView (good enough, not pixel-perfect) |
| Works anywhere: CI pipelines, GitHub Pages, docs sites, `<iframe>` | No client-side interactivity beyond native `<details>` |
| Single self-contained file — easy to email, commit, host | Schema rendering in Handlebars is more verbose than JSX |
| Leverages all 30+ existing mcpcontract helpers | Styling drift if CardView evolves without updating the template |
| Already has YAML/JSON auto-detection, mcpdesc format conversion | |

**Estimated effort:** Medium. ~400 lines of Handlebars HTML template + CSS, plus a `markdown` helper. No changes to the renderer engine.

**Maintenance model:** Separate visual template from React CardView, but shared data pipeline (mcpcontract parser, converter, validator).

---

### Option 2 — Standalone JS Bundle (`mcpdesc-ui` npm package)

**Approach:** Publish a standalone `mcpdesc-ui` npm package that bundles the React CardView as a drop-in JavaScript widget. Consumers add a `<script>` tag and get the interactive card view — exactly like Swagger UI.

**Deliverables:**
- `packages/mcpdesc-ui/` — Separate package with its own `package.json`
- Output: `mcpdesc-ui.js` + `mcpdesc-ui.css` (or CSS inlined)
- CDN-ready: `<script src="https://unpkg.com/mcpdesc-ui/dist/mcpdesc-ui.js"></script>`
- API: `McpDescUI({ dom_id: '#mcpdesc', spec: { ... } })` or `McpDescUI({ dom_id: '#mcpdesc', url: '/spec.yaml' })`
- Bonus: also exports `<McpDescCardView>` React component for React consumers

**How it works:**
1. Vite library build produces a UMD + ESM bundle
2. Bundle includes React 18 (internalized), CardView, core validator, yaml parser, marked
3. Tailwind CSS compiled to a scoped static stylesheet
4. CardView refactored to remove `useDoc` editor-navigation dependency (`NavBubble` becomes a plain badge when outside editor context)

**Usage:**
```html
<!-- Drop-in script tag -->
<div id="mcpdesc"></div>
<script src="https://unpkg.com/mcpdesc-ui/dist/mcpdesc-ui.js"></script>
<script>
  McpDescUI({
    dom_id: '#mcpdesc',
    url: '/api/mcpdesc.yaml'
  });
</script>
```

```tsx
// Or as a React component
import { McpDescCardView } from 'mcpdesc-ui';
<McpDescCardView doc={parsedDoc} validation={validationResult} />
```

| Pros | Cons |
|------|------|
| **Pixel-perfect parity** with editor preview — same React code | Bundle size: ~80–120KB gzipped (React + Tailwind + app) |
| **Single source of truth** for card rendering — no template duplication | Tailwind CSS scoping needed to avoid host page conflicts |
| Interactive: collapsible sections, hover effects, schema exploration | If consumer already uses React, they bundle it twice (unless using the React component export) |
| Familiar pattern (Swagger UI works identically) | Build setup: separate Vite library config, CSS extraction |
| React component export comes nearly free | |

**Estimated effort:** Medium. Main work: Vite library build config, Tailwind CSS scoping (prefix or CSS layers), and decoupling `NavBubble` from `useDoc`.

**Maintenance model:** Shared code. CardView changes automatically ship in the next `mcpdesc-ui` build.

---

## Comparison Matrix

| Criterion | Option 1: mcpcontract HTML | Option 2: mcpdesc-ui bundle | Both together |
|-----------|:-:|:-:|:-:|
| Visual parity with editor | ⚠️ Good enough | ✅ Pixel-perfect | ✅ / ⚠️ by use case |
| Single source of truth for cards | ❌ Separate template | ✅ Same React code | ❌ Two renderers |
| Works without client-side JS | ✅ | ❌ | ✅ (Option 1) |
| Framework-agnostic | ✅ | ✅ | ✅ |
| Bundle size to consumer | **0 KB** (static HTML) | **~80 KB gz** | Both available |
| CLI / CI friendly | ✅ Native | ⚠️ Needs wrapper | ✅ (Option 1) |
| Interactivity | ⚠️ `<details>` only | ✅ Full | ✅ (Option 2) |
| Integration effort | Low (file/iframe) | Low (script tag) | Low |
| Maintenance burden | Medium (template) | Low (shared code) | Medium |
| Implementation effort | Medium | Medium | Medium-high |
| Leverages existing CLI | ✅ mcpcontract | ❌ New package | ✅ / ❌ |

---

## Decision: Build Both (Options 1 + 2)

Both options serve different use cases with minimal overlap:

### Option 1 (mcpcontract static HTML) — for CI, docs, lightweight integration

**Use cases:**
- `mcpcontract document spec.yaml --template card-view -o index.html` in a CI pipeline
- Embed in GitHub Pages or docs sites as a static page
- Email or commit a human-readable HTML view alongside the mcpdesc file
- Environments where client-side JS is undesirable or prohibited

**Acceptable trade-off:** Approximate fidelity with the editor's CardView. Uses native `<details>` for collapsibility, inline CSS for styling. If someone wants pixel-perfect interactive rendering, they use `mcpdesc-ui` instead.

### Option 2 (mcpdesc-ui JS bundle) — for interactive web embedding

**Use cases:**
- Drop into a developer portal page (like Swagger UI in API docs)
- Embed in a React app as a component
- Live-reload preview during mcpdesc authoring outside the editor
- Any context where interactivity and visual fidelity matter

**Acceptable trade-off:** ~80KB gzipped bundle size. This is comparable to Swagger UI (~300KB gz) and acceptable for a developer-facing tool.

### Why both, not one or the other:

1. **Different audiences.** CI/docs teams want `mcpcontract document --template card-view`. Web developers want `<script src="mcpdesc-ui.js">`. Forcing one group into the other's tool creates friction.
2. **mcpcontract already exists.** Adding an HTML template is low marginal effort — no new CLI needed.
3. **Good enough ≠ pixel-perfect.** The static HTML serves the 80% case. The JS bundle serves the 20% that needs full fidelity.
4. **Independent timelines.** Option 1 can ship first (just a template file). Option 2 can follow as a separate package.

---

## Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Markdown lib for mcpcontract HTML template | CLI option: `--markdown-engine marked|markdown-it|snarkdown` (default: `marked`) |
| 2 | CSS approach for HTML template | Inline `<style>` block — self-contained single HTML file |
| 3 | Content scope for HTML template | Document content only. Invalid items omitted silently. CLI prints validation warnings/errors to stderr. HTML includes a `<script>` tag that logs validation issues to browser console. |
| 4 | JSON Schema depth in HTML template | One level deep — top-level properties table with type/required/description columns. Nested schemas rendered as raw JSON `<pre>` blocks. |
| 5 | mcpdesc-ui package location | In this repo: `packages/mcpdesc-ui/` (npm workspaces monorepo) |
| 6 | mcpdesc-ui API options | `theme: 'light' \| 'dark'` (light first, dark after editor implements it), `defaultOpen: boolean` (default: true), `showValidation: boolean` (bottom panel with independent scrollbar, hideable) |
| 7 | mcpdesc-ui URL fetching | Bundle handles fetching + YAML/JSON parsing internally from `url` option |
| 8 | mcpdesc-ui versioning | Independent semver, starting at `0.1.0`, own CHANGELOG |
| 9 | Package name | `mcpdesc-ui` (not publishing to npm registry yet) |
| 10 | Tailwind CSS scoping | Container selector: `.mcpdesc-ui-root` — Tailwind `important: '.mcpdesc-ui-root'`. No class renaming needed; CardView code unchanged. |

---

## Implementation Spec

### Phase 1: Static HTML Template in mcpcontract

**Summary:** Add a `card-view.html.hbs` Handlebars template to mcpcontract that produces a self-contained HTML page. No new CLI commands — uses the existing `mcpcontract document` command.

#### CLI Usage

```bash
# Basic usage
mcpcontract document spec.yaml --template card-view --output spec.html

# Choose markdown engine
mcpcontract document spec.yaml --template card-view --markdown-engine markdown-it --output spec.html

# Supported values: marked (default), markdown-it, snarkdown
```

#### Files to Create / Modify

**New files:**

| File | Description |
|------|-------------|
| `templates/card-view.html.hbs` | Main Handlebars template (~400–500 lines) |

**Modified files:**

| File | Changes |
|------|---------|
| `src/lib/renderer.ts` | 1. Register `markdown` Handlebars helper (wraps the selected Markdown engine). 2. Register `card-view` in template mapping / `getAvailableTemplates()`. |
| `src/commands/document.ts` | Add `--markdown-engine` option (enum: `marked`, `markdown-it`, `snarkdown`; default: `marked`). Pass engine choice to renderer. |
| `package.json` | Add `marked` as a dependency. Add `markdown-it` and `snarkdown` as optional peer dependencies. |

#### Template Structure (`card-view.html.hbs`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{info.name}} — {{info.title}}</title>
  <style>
    /* ~200 lines of hand-written CSS */
    /* Card containers, collapsible details, schema tables, badges, pills */
    /* Light theme palette matching CardView: gray-50 backgrounds, gray-900 text */
    body { font-family: system-ui, -apple-system, sans-serif; ... }
    .card { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 0.5rem; ... }
    .badge { display: inline-block; font-size: 0.75rem; padding: 0.125rem 0.5rem; ... }
    .schema-table { width: 100%; border-collapse: collapse; ... }
    .schema-table th { text-align: left; color: #9ca3af; ... }
    details summary { cursor: pointer; user-select: none; ... }
    /* ... */
  </style>
</head>
<body>
  <div class="container">

    <!-- Info Card -->
    <div class="card info-card">
      <div class="title-row">
        <h1>{{info.title}}{{#unless info.title}}{{info.name}}{{/unless}}</h1>
        <span class="badge version">{{info.version}}</span>
      </div>
      {{#if info.description}}<div class="description">{{{markdown info.description}}}</div>{{/if}}
      <!-- protocolVersion, id, websiteUrl, license, contact, icons -->
    </div>

    <!-- Transports -->
    <div class="card">
      <h2>Transports <span class="count">({{count transports}})</span></h2>
      {{#each transports}}
      <div class="item">
        <span class="badge transport">{{type}}</span>
        {{#if url}}<span class="url">{{url}}</span>{{/if}}
        {{#if command}}<code>{{command}}{{#if args}} {{join args " "}}{{/if}}</code>{{/if}}
      </div>
      {{/each}}
    </div>

    <!-- Security (if present) -->
    {{#if security}}
    <details open>
      <summary><h2>Security <span class="count">({{count security}})</span></h2></summary>
      {{#each security}} ... {{/each}}
    </details>
    {{/if}}

    <!-- Tools (if present) -->
    {{#if tools}}
    <details open>
      <summary><h2>Tools <span class="count">({{count tools}})</span></h2></summary>
      {{#each tools}}
      <details class="item-detail">
        <summary>
          <span class="badge tool">tool</span>
          <code class="name">{{name}}</code>
          {{#if title}}<span class="title-text">{{title}}</span>{{/if}}
          {{#if deprecated}}<span class="badge deprecated">deprecated</span>{{/if}}
        </summary>
        <div class="item-body">
          {{#if description}}<div class="description">{{{markdown description}}}</div>{{/if}}
          {{#if annotations}}
            <!-- readOnlyHint, destructiveHint, idempotentHint badges -->
          {{/if}}
          {{#exists inputSchema.properties}}
            <details>
              <summary class="schema-toggle">Input</summary>
              <table class="schema-table">
                <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
                <tbody>
                {{#each inputSchema.properties}}
                  <tr>
                    <td><code>{{@key}}</code>{{#contains ../inputSchema.required @key}}<span class="required">*</span>{{/contains}}</td>
                    <td><span class="type">{{type}}</span></td>
                    <td>{{description}}</td>
                  </tr>
                {{/each}}
                </tbody>
              </table>
              <!-- Nested schemas: raw JSON fallback -->
            </details>
          {{/exists}}
          {{#exists outputSchema}}
            <details>
              <summary class="schema-toggle">Output</summary>
              <!-- Same pattern: top-level properties table + JSON fallback -->
            </details>
          {{/exists}}
        </div>
      </details>
      {{/each}}
    </details>
    {{/if}}

    <!-- Resources + Resource Templates -->
    <!-- Prompts -->
    <!-- Tags -->
    <!-- Same pattern as Tools: <details open> → each item as nested <details> -->

  </div>

  <script>
    // Log validation issues to browser console (injected at generation time)
    {{#if _validation}}
    (function() {
      var issues = {{{json _validation}}};
      if (issues.errors && issues.errors.length) {
        console.group('%cmcpdesc validation errors', 'color: red; font-weight: bold');
        issues.errors.forEach(function(e) { console.error(e.path + ': ' + e.message); });
        console.groupEnd();
      }
      if (issues.warnings && issues.warnings.length) {
        console.group('%cmcpdesc validation warnings', 'color: orange; font-weight: bold');
        issues.warnings.forEach(function(w) { console.warn(w.path + ': ' + w.message); });
        console.groupEnd();
      }
    })();
    {{/if}}
  </script>
</body>
</html>
```

#### Validation Behavior

1. **CLI (stderr):** mcpcontract already validates during `document` processing. Print errors/warnings to stderr:
   ```
   ⚠ /tools/0/name: Missing required property
   ⚠ /info/version: Should follow semver (X.Y.Z)
   ```
2. **HTML (browser console):** The renderer passes validation results as `_validation` context to the template. The `<script>` block logs them via `console.error` / `console.warn` with grouping.
3. **Invalid items:** Items with validation errors at the item level (e.g., `/tools/0`) are excluded from the rendered output (same behavior as the editor's CardView `errorPaths` filtering).

#### New Handlebars Helper: `markdown`

```typescript
// In renderer.ts — registerHelpers()
hbs.registerHelper('markdown', function(text: string) {
  if (!text) return '';
  // Engine selection based on CLI option (passed via render context or constructor)
  const html = markdownEngine.render(text);
  return new Handlebars.SafeString(html);
});
```

- Default engine: `marked` (added as a dependency)
- Alternative engines: `markdown-it`, `snarkdown` (optional peer dependencies)
- Engine is selected via `--markdown-engine` CLI flag, passed to the renderer

---

### Phase 2: mcpdesc-ui Standalone Package

**Summary:** A standalone JavaScript bundle in `packages/mcpdesc-ui/` that renders the interactive React CardView into any web page.

#### Package Structure

```
packages/mcpdesc-ui/
├── package.json
├── CHANGELOG.md
├── README.md
├── tsconfig.json
├── vite.config.ts              # Library build config
├── src/
│   ├── index.ts                # Main entry: McpDescUI() function
│   ├── McpDescCardView.tsx     # Standalone CardView (forked from editor, no useDoc)
│   ├── ValidationPanel.tsx     # Bottom validation panel (hideable, independent scroll)
│   ├── types.ts                # Public API types
│   └── styles.css              # Tailwind entry (compiled to scoped CSS)
└── dist/                       # Build output
    ├── mcpdesc-ui.js           # UMD bundle (includes React)
    ├── mcpdesc-ui.mjs          # ESM bundle (includes React)
    ├── mcpdesc-ui.css          # Scoped CSS
    └── mcpdesc-ui.d.ts         # TypeScript declarations
```

#### package.json

```json
{
  "name": "mcpdesc-ui",
  "version": "0.1.0",
  "description": "Interactive MCP Description card view — drop-in web component",
  "type": "module",
  "main": "dist/mcpdesc-ui.js",
  "module": "dist/mcpdesc-ui.mjs",
  "types": "dist/mcpdesc-ui.d.ts",
  "exports": {
    ".": {
      "import": "./dist/mcpdesc-ui.mjs",
      "require": "./dist/mcpdesc-ui.js",
      "types": "./dist/mcpdesc-ui.d.ts"
    },
    "./react": {
      "import": "./dist/mcpdesc-ui-react.mjs",
      "types": "./dist/mcpdesc-ui-react.d.ts"
    },
    "./dist/mcpdesc-ui.css": "./dist/mcpdesc-ui.css"
  },
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "marked": "^17.0.0",
    "yaml": "^2.6.0",
    "ajv": "^8.17.0",
    "ajv-formats": "^3.0.0"
  }
}
```

#### Public API (`src/types.ts`)

```typescript
export interface McpDescUIOptions {
  /** CSS selector for the container element (required) */
  dom_id: string;

  /** Pre-parsed MCP Description document object */
  spec?: McpDescDocument;

  /** URL to fetch a YAML or JSON mcpdesc file from */
  url?: string;

  /** Color theme: 'light' (default) or 'dark' */
  theme?: 'light' | 'dark';

  /** Whether <details> sections start expanded (default: true) */
  defaultOpen?: boolean;

  /** Show validation panel at the bottom (default: true if errors/warnings exist) */
  showValidation?: boolean;
}

export interface McpDescUIInstance {
  /** Update the displayed document */
  updateSpec(spec: McpDescDocument): void;

  /** Reload from the configured URL */
  reload(): Promise<void>;

  /** Unmount and clean up */
  destroy(): void;
}
```

#### Entry Point (`src/index.ts`)

```typescript
import { createRoot } from 'react-dom/client';
import { McpDescCardView } from './McpDescCardView';
import { ValidationPanel } from './ValidationPanel';
import { McpDescValidator } from '../../src/core/validator';
import yaml from 'yaml';
import type { McpDescUIOptions, McpDescUIInstance } from './types';

export function McpDescUI(options: McpDescUIOptions): McpDescUIInstance {
  const container = document.querySelector(options.dom_id);
  if (!container) throw new Error(`mcpdesc-ui: element not found: ${options.dom_id}`);

  // Add scoping root class
  container.classList.add('mcpdesc-ui-root');

  const root = createRoot(container);
  const validator = new McpDescValidator();
  // ... load schema, parse spec or fetch URL, validate, render
  // Returns instance with updateSpec(), reload(), destroy()
}

// Also export React component for React consumers
export { McpDescCardView } from './McpDescCardView';
export type { McpDescUIOptions, McpDescUIInstance } from './types';
```

#### Consumer Usage — Script Tag

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="mcpdesc-ui.css">
</head>
<body>
  <div id="mcpdesc"></div>
  <script src="mcpdesc-ui.js"></script>
  <script>
    // From URL (bundle fetches and parses internally)
    const ui = McpDescUI({
      dom_id: '#mcpdesc',
      url: '/api/mcpdesc.yaml',
      theme: 'light',
      defaultOpen: true,
      showValidation: true
    });

    // Or from pre-parsed object
    McpDescUI({
      dom_id: '#mcpdesc',
      spec: { mcpdesc: '0.6.0', info: { name: 'my-server', ... }, ... }
    });

    // Later: update
    ui.updateSpec(newDoc);

    // Cleanup
    ui.destroy();
  </script>
</body>
</html>
```

#### Consumer Usage — React Component

```tsx
import { McpDescCardView } from 'mcpdesc-ui/react';
import 'mcpdesc-ui/dist/mcpdesc-ui.css';

function MyPage({ doc, validation }) {
  return (
    <div className="mcpdesc-ui-root">
      <McpDescCardView
        doc={doc}
        validation={validation}
        theme="light"
        defaultOpen={true}
      />
    </div>
  );
}
```

#### Vite Library Build Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: {
        'mcpdesc-ui': resolve(__dirname, 'src/index.ts'),
        'mcpdesc-ui-react': resolve(__dirname, 'src/McpDescCardView.tsx'),
      },
      name: 'McpDescUI',
      formats: ['umd', 'es'],
    },
    rollupOptions: {
      // Internalize React (bundle it in) for the UMD build
      // Externalize React for the /react entry point (peer dep)
    },
    cssCodeSplit: false, // Single CSS file
  },
});
```

#### Tailwind Scoping (`styles.css`)

```css
@import "tailwindcss";

/* Tailwind v4: scope all utilities under .mcpdesc-ui-root */
@layer utilities {
  .mcpdesc-ui-root {
    /* Container scoping — all Tailwind utilities only apply inside this root */
  }
}
```

Tailwind config sets `important: '.mcpdesc-ui-root'` so all generated utility classes get `.mcpdesc-ui-root .bg-gray-50 { ... }` specificity.

#### CardView Refactoring

The editor's `CardView.tsx` has one editor-specific dependency: `NavBubble` calls `useDoc().revealSectionItemRef`. For `mcpdesc-ui`:

1. `NavBubble` is replaced with a plain `Badge`-like element (no click handler, no `useDoc` import)
2. All other sub-components (`InfoCard`, `ToolsCard`, `SchemaView`, etc.) work as-is — they only depend on the `doc` prop
3. The `McpDescCardView` component accepts `doc`, `validation`, `theme`, `defaultOpen` as props

#### Validation Panel

A new `ValidationPanel` component (separate from the editor's version):
- Rendered below the card view as a fixed-height panel
- Independent vertical scrollbar
- Lists errors (red) and warnings (yellow) with JSON pointer paths
- Toggle to hide/show (controlled by `showValidation` option)
- When hidden, shows a collapsed status bar: "3 errors, 2 warnings" (click to expand)

---

### Phase 3: Editor Alignment (optional, reduces maintenance)

**Summary:** Align the editor's Markdown preview with mcpcontract's templates and make the editor consume `mcpdesc-ui` for its CardView.

#### Steps

1. **Replace `src/core/template.ts`** with the content of mcp-contract's `default-dump.md.hbs` (or import it as a raw string via Vite's `?raw` import)
2. **Port missing Handlebars helpers** to `src/core/renderer.ts`: `tableBr`, `firstSentence`, `formatNumberConstraints`, `formatStringConstraints`, `formatArrayConstraints`, `formatDate`, `singularLabel`
3. **Make the editor's CardView import from `mcpdesc-ui`** — change `src/components/preview/CardView.tsx` to re-export from `packages/mcpdesc-ui/src/McpDescCardView.tsx`, or restructure as a shared source module
4. **Keep `NavBubble` editor-specific** — the editor wraps the mcpdesc-ui CardView and provides an overlay or wrapper that adds editor navigation on top

---

## Dependency Graph

```
mcptoolkit-editor (this repo)
├── src/                        ← Editor app (Vite SPA)
│   ├── core/                   ← Validator, renderer, types (browser-compatible)
│   ├── components/preview/     ← CardView (currently editor-specific)
│   └── ...
├── packages/mcpdesc-ui/        ← Phase 2: standalone JS bundle
│   ├── src/McpDescCardView.tsx ← CardView fork (no editor deps)
│   └── dist/                   ← Built UMD + ESM + CSS
└── ref/mcp-contract/           ← Phase 1: existing CLI
    ├── templates/card-view.html.hbs  ← New HTML template
    └── src/lib/renderer.ts           ← Add markdown helper
```

After Phase 3:
```
packages/mcpdesc-ui/src/McpDescCardView.tsx  ← Single source of truth for card rendering
  ↑ imported by editor (src/components/preview/ wraps it with NavBubble)
  ↑ bundled into mcpdesc-ui.js (standalone)

ref/mcp-contract/templates/card-view.html.hbs  ← Independent "good enough" HTML rendering
ref/mcp-contract/templates/default-dump.md.hbs ← Source of truth for Markdown rendering
  ↑ editor's src/core/template.ts mirrors this
```
