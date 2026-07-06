# @cisco_open/mcptoolkit-viewer

Interactive card view for [MCP Description](https://github.com/anthropics/model-context-protocol) documents — analogous to what [Swagger UI](https://github.com/swagger-api/swagger-ui) is to the Swagger Editor.

![alt text](screenshot.png)

## Quick Start — Script Tag

```html
<link rel="stylesheet" href="dist/mcptoolkit-viewer.css">
<div id="mcpdesc"></div>
<script src="dist/mcptoolkit-viewer.js"></script>
<script>
  McpToolkitViewer({
    dom_id: '#mcpdesc',
    url: '/api/mcpdesc.yaml'
  });
</script>
```

## Quick Start — React Component

```tsx
import { McpDescCardView } from '@cisco_open/mcptoolkit-viewer/react';
import '@cisco_open/mcptoolkit-viewer/dist/mcptoolkit-viewer.css';

function MyPage({ doc, validation }) {
  return (
    <div className="mcptoolkit-viewer-root">
      <McpDescCardView doc={doc} validation={validation} />
    </div>
  );
}
```

## API

### `McpToolkitViewer(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dom_id` | `string` | — | **Required.** CSS selector for the container element. |
| `spec` | `McpDescDocument` | — | Pre-parsed MCP Description document object. |
| `url` | `string` | — | URL to fetch a YAML or JSON mcpdesc file from. |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme. |
| `defaultOpen` | `boolean` | `true` | Whether `<details>` sections start expanded. |
| `showValidation` | `boolean` | `true` | Show validation panel at the bottom. |

Returns a `McpToolkitViewerInstance` with:
- `updateSpec(spec)` — Update the displayed document
- `reload()` — Re-fetch from the configured URL
- `destroy()` — Unmount and clean up

## Build

```bash
npm run build
```

## License

See root repository LICENSE.
