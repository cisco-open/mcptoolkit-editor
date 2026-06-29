# MCP Toolkit: MCP Description Editor

A web-based editor for MCP Description documents — visualize, update, validate, and export documents.

[MCP Description](https://github.com/cisco-open/mcp-description) is a portable, machine-readable contract format for MCP servers. Think "OpenAPI for MCP." 

This editor gives you a fast feedback loop while authoring or reviewing those contracts.

![alt text](docs/img/screenshot.png)

## Features

- **Monaco Editor** — Full code editor with JSON Schema-driven autocomplete, inline validation squiggles, folding, and syntax highlighting for both JSON and YAML
- **Real-time validation** — AJV-based schema validation against MCP Description, plus semantic warnings (semver format, empty capabilities, duplicate names)
- **Structured preview** — Interactive "Cards" view with collapsible sections for server info, transports, security, capabilities, tools (with input/output schemas), resources, resource templates, prompts, and tags
- **Click-to-navigate** — Click any type bubble in the preview to jump to its definition in the editor
- **Markdown preview** — Handlebars-rendered markdown documentation, ready for copy-paste or export
- **JSON ↔ YAML** — Edit in either format; auto-detected on load, convertible with one click
- **Export** — Download as `.mcpdesc.json`, `.mcpdesc.yaml`, or `.md`
- **File import** — Open any `.json` or `.yaml` file from disk
- **Bundled examples** — Load examples of MCP Descriptions
- **LocalStorage persistence** — Edits survive page reloads
- **Pure client-side** — No backend required; host as static files or run locally

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/`. Serve it with any static file server:

```bash
npm run preview          # Vite preview server
# or
npx serve dist           # any static server
```

## Project Structure

```
src/
  core/                        # Reusable library (browser-compatible, no React)
    types.ts                   # MCP Description TypeScript types
    validator.ts               # AJV-based schema validator
    renderer.ts                # Handlebars markdown renderer
    template.ts                # Markdown Handlebars template
    mcpdesc-schema.json        # MCP Description JSON Schema
    index.ts                   # Public API barrel
  components/
    Editor.tsx                 # Monaco editor wrapper
    Toolbar.tsx                # Top toolbar (file, examples, format, export)
    SplitPane.tsx              # Resizable split-pane layout
    ValidationPanel.tsx        # Error/warning status bar
    preview/
      PreviewPanel.tsx         # Tab container (Cards | Markdown)
      CardView.tsx             # Structured interactive preview
      MarkdownView.tsx         # Handlebars-rendered markdown preview
  hooks/
    useDoc.tsx                 # Central state (React Context + useReducer)
  examples/
    index.ts                   # Bundled example documents
  App.tsx                      # Root layout
  main.tsx                     # Entry point
```

## Documentation Layout

- `docs/` — end-user guides and examples
- `docs/maintainers/` — maintainer-focused design and implementation references
- `docs/dust/` — archived planning and historical notes
- `docs/img/` — repository documentation images

### Core Library (`src/core/`)

The core module has **no React or DOM dependencies**. It exports:

- `McpDescValidator` — compile a JSON Schema once, then validate documents
- `McpDescRenderer` — render an MCP Description document to markdown via Handlebars
- Full TypeScript type definitions for MCP Description

This module is adapted from [mcp-contract](https://github.com/cisco-open/mcp-contract) and designed to be extractable as a standalone `@mcpcontract/core` package.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Validation | AJV 8 + ajv-formats |
| Markdown | Handlebars 4 |
| YAML | yaml 2 |
| Styling | Tailwind CSS 4 |

## License

This software is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.


