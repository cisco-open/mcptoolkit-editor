# Option: @tailwindcss/typography

## Current approach

We manually style HTML produced by `marked` in the `Desc` component using Tailwind arbitrary-variant selectors:

```
[&_ul]:list-disc [&_ul]:pl-5
[&_ol]:list-decimal [&_ol]:pl-5
[&_li]:my-0 [&_p]:my-1
[&_code]:text-xs [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded
[&_a]:text-blue-600
```

This works but only covers the elements we've encountered so far.

## Alternative: install @tailwindcss/typography

```bash
npm install @tailwindcss/typography
```

Then in `src/index.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

Replace all the manual `[&_*]` selectors in `Desc` with:

```
prose prose-sm prose-gray max-w-none
```

### Benefits

- **Lists** (`<ul>`, `<ol>`, `<li>`) — bullets, numbers, padding, and spacing out of the box
- **Headings** (`<h1>`–`<h6>`) — appropriate sizes, weight, margins
- **Code blocks** (`<pre><code>`) — background, padding, rounded corners, overflow handling
- **Inline code** (`<code>`) — styled without manual selectors
- **Links** (`<a>`) — color + underline by default
- **Tables** (`<table>`) — borders, padding, striping
- **Blockquotes** (`<blockquote>`) — left border + italic
- **Nested content** — proper vertical rhythm between any combination of elements
- **Paragraph spacing** — consistent margins between `<p>` tags

### Tradeoff

- Adds ~3–4 KB gzipped to the bundle
- Slightly less granular control over exact spacing (but `prose-sm` is compact and individual elements can still be overridden with `prose-*` modifiers)

### Migration

1. Install the plugin
2. Add `@plugin` to `index.css`
3. In `CardView.tsx` `Desc` component, replace the className with `prose prose-sm prose-gray max-w-none`
4. Remove all manual `[&_*]` selectors
5. Verify rendering with the `openapi_analyzer-0.11.0.yaml` example (has the widest variety of markdown constructs)
