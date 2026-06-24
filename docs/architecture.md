# The walaware app blueprint

Every walaware app is the same shape. Learn it once; it applies to all of them.

## Stack

| Layer | Choice |
| --- | --- |
| Backend | **PocketBase** (single Go binary: SQLite + auth + admin UI + REST/realtime) |
| Frontend | **SvelteKit 5** (Svelte 5 runes, adapter-node) |
| Styling | **Tailwind CSS v4** + **[@walaware/design](https://github.com/walaware/design)** (Campfire house style, per-app accent) |
| Proxy | **Caddy** — single origin (`/api` + `/_` → PocketBase, everything else → web) |
| Long-lived work | an optional **`worker`** service (cron/queues/automation) in the app's *own* stack |
| Deploy | **Docker Compose**, one stack; prebuilt **GHCR** images for the homelab |
| Tooling | **pnpm**; secrets via **1Password `op://`** |

## Repo layout

```
<app>/
├── compose.yml          # pocketbase + web (+ worker) + caddy
├── compose.prod.yml     # pulls GHCR images, no local build
├── Caddyfile                   # single entry point (same-origin)
├── .env.example                # all config; op:// URIs in prod
├── pocketbase/
│   ├── Dockerfile              # pinned PB version
│   └── pb_migrations/*.js      # schema + rules + seed — the source of truth
├── web/                        # SvelteKit app; consumes @walaware/design
│   └── src/{routes,lib/server,lib/ui}, app.html, app.css
├── worker/                     # (if needed) always-on service, behind clean seams
└── docs/                       # design docs / specs
```

## How the pieces fit

- **One origin.** Caddy serves the SvelteKit app and reverse-proxies PocketBase
  under `/api` and `/_`, so the browser, SSR, and PocketBase are same-origin (no
  CORS). Dev mirrors this via Vite's proxy.
- **Server-mediated data.** The browser **never** talks to PocketBase directly.
  Collection API rules are locked to **superuser-only** (a final `lock_rules`
  migration); the SvelteKit server authenticates as the superuser and performs
  all reads (in `load()`) and writes (in form actions / endpoints), scoping every
  operation. This is the security boundary — keep it in one place.
- **Migrations are the source of truth.** Schema, API rules, and seed data are
  numbered `*.js` migrations that auto-apply on `serve`. Never hand-edit the DB.
- **Design is shared, domain is local.** Generic primitives come from
  `@walaware/design`; app-specific/domain components live in the app repo. Promote
  a pattern into the shared package only after it's proven in ~3 apps (rule of three).
- **The `worker` is self-contained.** When an app needs always-on work, it runs as
  a `worker` container in that app's own compose stack — not an external
  orchestrator. It exposes a thin seam (MCP/API) so other tools can integrate
  later, but it never *depends* on one.

## AI, when an app uses it

Vendor-neutral and BYO-token. One gateway file isolates all vendor coupling
(OpenAI-compatible → OpenRouter default, MiniMax, DeepSeek, Groq, local/Ollama).
Calls are **bounded and schema-validated** (Zod); **deterministic code owns the
loop and gates every consequential action**; with no key configured, every AI
feature **degrades to a deterministic fallback**. Cheap-model-first. Per-call
usage/cost is logged; an optional budget cap stops runaway spend. See
[conventions.md](conventions.md) and, for the fullest worked example, shopwala's
`docs/05-brain-spec.md`.
