# walaware conventions

The rules every repo follows. Paired with [architecture.md](architecture.md).

## Staying in sync

Two repos are the shared source of truth for the whole suite — **each app should
check them periodically (e.g. start of a work session, or before a release) and
realign**:

- **[`walaware/design`](https://github.com/walaware/design)** — the design
  system. Bump the `@walaware/design` dependency to the latest tag and reconcile
  any component/token changes; don't fork house style locally.
- **`walaware/.github`** (this repo) — conventions + architecture. Adopt new
  conventions as they land (ports, secrets, data, etc.) so the apps don't drift.

Drift is the thing to avoid: a convention added here, or a design update shipped
there, is only useful once every app picks it up.

## PocketBase / data

- **Migrations are the source of truth.** Numbered `pocketbase/pb_migrations/*.js`,
  applied on `serve`. Every data change ships a migration; never hand-edit the DB
  or admin UI for schema.
- **Convention:** snake_case fields; money as integer `*_cents` + ISO-4217
  `currency` (never floats); `created`/`updated` autodate on every collection;
  enums as `select` fields; opaque external ids as `external_id` text.
- **Lock rules last.** A final `lock_rules` migration sets every collection's API
  rules to superuser-only. All access flows through the app server.
- **Seed a demo row** so the UI renders end-to-end during scaffold (idempotent).

## API access (when an app exposes one)

- **Programmatic access uses scoped tokens, never superuser.** An `api_clients`
  auth collection holds one record per consumer with a `scopes` allowlist; the app
  server mints long-lived tokens via PocketBase's `impersonate` endpoint. Consumers
  get exactly `<APP>_API_URL` + `<APP>_API_TOKEN`.
- **Curated surface over raw collections.** Expose a versioned `/api/x/v1/*` via a
  PB JS hook returning stable payloads — don't open raw collection rules. Reads and
  writes are separate scope allowlists.
- **Tailnet-only.** The API is a separate Caddy site on the trusted tailnet
  proxying only `/api/x/*`; the public edge and the superuser-only collection rules
  are unchanged. Full standard + reference kit:
  [api-access.md](api-access.md) · [`../templates/api-access/`](../templates/api-access/).

## Web (SvelteKit 5)

- Svelte 5 **runes** (`$props`, `$state`, `$derived`); JSDoc types in `.js`,
  TS in `.ts`; Prettier-formatted.
- Reads in `+page.server.js` `load()`; writes in form actions / `+server.js`
  endpoints — both as the superuser server client, both scoped.
- `app.css`: `@import 'tailwindcss';` then `@import '@walaware/design/theme.css';`.
  Fonts (Fredoka + Nunito) via `<link>` in `app.html`. Set `data-app="<app>"` on
  `<html>` for the per-app accent.
- Before a PR: `pnpm check` (types) clean, `pnpm build` succeeds.

## Worker (when present)

- Long-lived Node/TS service; **deterministic code owns the loop**, not an agent.
- External integrations sit behind a **clean interface** (e.g. a channel/adapter
  seam) so new sources are new adapters, not a rewrite. Keep names generic — no
  vendor names leaking into the core data model or loop.
- Human-paced where it automates a real account (jitter, waking-hours, conservative
  defaults). Anything consequential is gated and (by default) human-approved.

## AI brain (when present)

- All vendor coupling in **one gateway file** (`brain/provider.ts`); every call is
  `generateObject({ model, schema })`-style and provider-agnostic
  (OpenAI-compatible; OpenRouter default).
- **Always Zod-validate** model output (native structured output where supported,
  else prompt+parse); **repair once**, then escalate/fallback — never act on
  unvalidated output.
- Per-task model config, cheap-first. Vision degrades gracefully when no vision
  model is set. Log per-call usage + cost; honor an optional monthly budget cap.

## Local development

- **Default loop: run `web` natively for HMR; PocketBase in docker.** `vite dev`
  serves the SvelteKit app with hot-module reload and **proxies `/api` + `/_` to
  PocketBase** (already wired in each app's `vite.config.js`), so the browser and
  SSR stay same-origin — this is the proxy model in
  [architecture.md](architecture.md). Run PocketBase via docker with its `8090`
  **published to the host** so vite can reach it (or run the binary natively).
  Full `docker compose up` is the **production-parity check** — run it before a
  PR/deploy — not the iteration loop.
- **Exactly one PocketBase per app.** Two PocketBase on the same `:8090` is the one
  collision that silently corrupts dev: the records API returns
  `404 "Missing collection context"` while `/api/health` and schema endpoints still
  200 — easy to misread as an app bug. Keep each app on its own PB port (below).
- **Per-app dev ports** — allocate by app index `n` (tripwala 0, shopwala 1, …):
  vite `5173 + n*100`, PocketBase `8090 + n*100`. Each app sets `server.port` + the
  proxy target in its `vite.config.js` accordingly (and registers the matching
  OAuth redirect URI — see below).

  | App | dev vite (web) | dev PocketBase |
  | --- | --- | --- |
  | tripwala | 5173 | 8090 |
  | shopwala | 5273 | 8190 |
  | _next app_ | 5373 | 8290 … (increment) |

  Shared **libraries** (e.g. `@walaware/design`) have no PocketBase/OAuth — run
  their playground off the app grid (Storybook's `6006`, or vite on `5901` — **not
  `5900`, which is macOS Screen Sharing/VNC**).

- **Host port registry** — the published **Caddy** entrypoint for full-stack
  (`docker compose up`) / prod-parity runs (each app publishes Caddy here; OAuth
  redirect URI below):

  | App | Host (Caddy) |
  | --- | --- |
  | tripwala | `8080` |
  | shopwala | `8081` |
  | _next app_ | `8082` … (increment) |

- **Google OAuth redirect URIs.** Sign-in sends `${origin}/auth/callback`, and
  Google does an **exact-match** on scheme + host + **port** + path — so register
  one redirect URI per origin you sign in from, under the OAuth client's
  **Authorized redirect URIs** (not "Authorized JavaScript origins"; this is a
  server-side code exchange). Each app needs all three surfaces — e.g. tripwala:

  | Surface | Redirect URI |
  | --- | --- |
  | native dev (vite) | `http://localhost:5173/auth/callback` |
  | docker stack (Caddy) | `http://localhost:8080/auth/callback` |
  | production | `https://<app-domain>/auth/callback` |

  Swap in each app's own ports from the tables above; the path is always
  `/auth/callback`. **Always `localhost`, never `127.0.0.1`** — Google treats them
  as different origins (the classic `redirect_uri_mismatch`). Changes take a minute
  or two to propagate.

## Secrets & deploy

- **No secrets in code.** `.env.example` is a committed *template* of 1Password
  references, not values. All of an app's secrets live under **one item per
  environment** in a shared vault (e.g. `homelab` vault, item `<app>-dev`), one
  field per secret — easy to audit and rotate in a single place.
- **Resolve once, then run docker normally.** `scripts/env-from-op.sh` runs
  `op inject -i .env.example -o .env`; `docker compose up` reads `.env` like any
  other — no `op run` wrapper per command. Re-run after a rotation. `.env` is
  gitignored and `chmod 600`. Keep literal `<vault>/<item>/<field>` references
  out of comments — `op inject` resolves any it finds, so an example ref in a
  comment fails the whole inject.
- **Compose files use Compose v2 names** (no `docker-` prefix), one stack per app:
  `compose.yml` (the full stack — dev prod-parity, builds locally),
  `compose.dev.yml` (dev override that publishes PocketBase to the host for the
  native-`vite` loop), `compose.prod.yml` (pulls GHCR images named
  `<app>-<service>`). Back up the `pb_data` volume.
- CI (`.github/workflows/docker.yml`) builds + pushes images on `main` / tags.

## Naming

- Repos `walaware/<app>`; packages `@walaware/<app>-<part>`
  (`-web`, `-core`, `-worker`, `-mcp`); GHCR images `<app>-<service>`.

## Licensing

Apps → **AGPL-3.0**; shared libraries → **MIT**. See
[DOCUMENTATION.md §5](../DOCUMENTATION.md).
