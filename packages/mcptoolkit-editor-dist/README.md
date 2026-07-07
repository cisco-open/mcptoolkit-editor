# @cisco_open/mcptoolkit-editor-dist

This module exposes the **MCP Description Editor**'s entire prebuilt `dist/`
folder as a dependency-free npm package — the analog of `swagger-editor-dist`.
It lets you host the editor anywhere without building it from source.

The build is fully self-contained and **host-neutral**: Monaco Editor and its web
workers are served from the bundle's own origin (no CDN), and all asset paths are
**relative**, so the `dist/` folder can be served from any domain, subdomain, or
subpath. It makes **no network requests of its own** and ships **no telemetry**
(see [Privacy & analytics](#privacy--analytics)).

> Prefer to build from source (and pin your own toolchain)? Clone
> [`cisco-open/mcptoolkit-editor`](https://github.com/cisco-open/mcptoolkit-editor)
> and run `npm run build` — this package is just that build output, published.

## Install

```bash
npm install @cisco_open/mcptoolkit-editor-dist
```

## Serve

Serve the prebuilt `dist/` directory with any static file server:

```bash
npx serve node_modules/@cisco_open/mcptoolkit-editor-dist/dist
```

Or copy it into your host's web root / Cloudflare Pages (or Netlify, S3, GitHub
Pages, …) output directory:

```bash
cp -R node_modules/@cisco_open/mcptoolkit-editor-dist/dist/. ./public/editor/
```

Because assets use relative paths, serving from a subpath such as
`https://example.com/editor/` works without extra configuration.

## Content-Security-Policy

The editor runs under a strict CSP. A recommended baseline (also shipped as
`dist/_headers` for hosts that honor it, e.g. Cloudflare Pages / Netlify):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

## Contents

- `dist/index.html` — entry point
- `dist/assets/*` — hashed JS/CSS chunks and Monaco web workers
- `dist/_headers` — default security headers for supporting static hosts

## Privacy & analytics

This package ships **no telemetry**. Unlike some `*-dist` packages, it has **no
install-time analytics** — there is no `postinstall` hook and no
[Scarf](https://scarf.sh/)-style beacon; installing or copying it sends nothing.
The prebuilt app is pure client-side and makes **no network requests of its
own** (verify with your browser's Network tab: zero third-party calls).

Runtime (in-browser) usage analytics are intentionally a **hosting decision**,
left to whoever serves the bundle. If you want them, add your own script at your
hosting layer and permit it in the page's CSP (`script-src` / `connect-src`).
The rationale, trade-offs, and options are documented in
[docs/maintainers/analytics.md](https://github.com/cisco-open/mcptoolkit-editor/blob/main/docs/maintainers/analytics.md).

## License

Apache-2.0. See the [repository](https://github.com/cisco-open/mcptoolkit-editor)
for source and contribution guidelines.
