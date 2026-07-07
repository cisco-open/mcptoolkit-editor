# Analytics & Telemetry — Options and Considerations

Status: **no analytics anywhere, by default.** This document exists so the choice
is deliberate and revisitable, not accidental. It lists the layers where
analytics *could* live, the options for each, and a recommendation.

## Why this is a distinct decision

The suite ships three artifacts (see [`distribution.md`](distribution.md)):

| Artifact | Consumption | Where analytics could hook in |
|----------|-------------|-------------------------------|
| `mcptoolkit-editor` (root app, `private`) | deployed as a hosted site | runtime (in-browser) |
| `@cisco_open/mcptoolkit-viewer` | `npm install` + `import` | install-time and/or runtime |
| `@cisco_open/mcptoolkit-editor-dist` | `npm install` **or** copy `dist/` into a web root | install-time and/or runtime |

There are two independent layers, plus the hosting layer:

1. **Install-time analytics** — fires during `npm install` of a *published* package.
2. **Runtime analytics** — fires in the browser when the app is loaded.
3. **Hosting analytics** — configured by whoever serves the app (e.g. the
   separate Cloudflare/`mcptoolkit-org` hosting repo). Out of scope for this repo.

## Layer 1 — Install-time (npm) analytics

**What it is.** A `postinstall` beacon that reports anonymized install events
(package name/version, OS, CI vs not) to help maintainers gauge adoption. The
reference example is [Scarf](https://scarf.sh/) / `scarf-js`, which
`swagger-editor-dist` uses. Users opt out with `scarfSettings.enabled: false` in
their `package.json` or `SCARF_ANALYTICS=false npm install`.

**Applies to:** only the published packages (`mcptoolkit-viewer`,
`mcptoolkit-editor-dist`). Not the root app (never published) and not hosting.

**Pros**
- Adoption signal for maintainers; common in OSS.
- Opt-out is standardized and documented.

**Cons / risks**
- Privacy: sends data at install without an explicit prompt; many users dislike
  `postinstall` beacons.
- Adds a runtime dependency + a `postinstall` script (supply-chain surface,
  provenance noise, slower installs). Many orgs run `npm ci --ignore-scripts` or
  block Scarf outright, so numbers are partial anyway.
- **Undercounts real usage** for `-dist`: hosts frequently *copy* `dist/` into a
  web root or a Docker image rather than keeping it as an installed dependency,
  so install events do not reflect page views.
- Cisco open-source governance generally expects telemetry to be clearly
  disclosed and, ideally, opt-in — a default-on beacon may need review.

**If we ever adopt it:** prefer npm's own (passive) download statistics first —
they require no code, no dependency, and no beacon. Only add Scarf if download
stats prove insufficient, and document the opt-out prominently in the README
(as `swagger-editor-dist` does).

## Layer 2 — Runtime (in-browser) analytics

**What it is.** A script embedded in the app that pings an analytics backend
(Plausible, GA, self-hosted, …) on page load / interaction.

**Key point:** for `-dist` this is a **hosting concern, not a package concern**.
The bundle is host-neutral static files; baking a vendor/endpoint into it would
break that neutrality and force a CSP `connect-src` exception on every host.

**Options**
- **A. Keep it out of the bundle (recommended).** Hosts inject their own script
  and adjust their CSP. Zero coupling; each host owns its privacy posture.
- **B. Build-time, env-gated, off by default.** Wire an optional
  `VITE_ANALYTICS_*` env var so a builder can opt in at build time (empty =
  disabled). Matches the project rule that *any analytics must be env-gated and
  off by default*. Downside: still bakes a vendor SDK into the source tree; the
  published `-dist` artifact would be built with analytics **disabled**.
- **C. Runtime-config hook.** Ship a no-op `window.MCPTOOLKIT_ANALYTICS` seam the
  host can populate. More flexible, more surface area; likely overkill now.

Whatever the choice, it must not add third-party requests to the default
published bundle (the README promises "no network requests of its own").

## Common policy vs per-artifact

- **Common policy (recommended):** one rule — *no phone-home by default; any
  analytics is opt-in and documented* — applied consistently to the viewer, the
  `-dist` bundle, and hosting. Simple to communicate and to reason about.
- **Per-artifact implementation:** the *mechanism* differs by consumption model
  (a library vs a static bundle vs a hosted site), so implement per artifact even
  if the policy is shared.

## Recommendation

1. **Ship all artifacts telemetry-free by default** (current state). This matches
   the host-neutral goal and the "env-gated, off by default" project rule, and
   avoids Cisco OSS governance friction.
2. For adoption signal, **use npm download stats** (passive, no code) before
   considering an install-time beacon like Scarf.
3. Keep **runtime analytics out of the `-dist` package**; the hosting repo (e.g.
   Cloudflare/`mcptoolkit-org`) owns it, env-gated and off by default.
4. Revisit this document if maintainers need harder adoption data or if a hosting
   deployment requires standardized runtime metrics.

## References

- `swagger-editor-dist` "Anonymized analytics" section (Scarf): <https://www.npmjs.com/package/swagger-editor-dist>
- Scarf opt-out for users: <https://github.com/scarf-sh/scarf-js#as-a-user-of-a-package-using-scarf-js-how-can-i-opt-out-of-analytics>
- npm download counts: <https://docs.npmjs.com/about-package-download-counts>
