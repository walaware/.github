# walaware conventions

The rules every repo follows. Paired with [architecture.md](architecture.md).

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

## Secrets & deploy

- **No secrets in code.** `.env.example` documents every var; real values come
  from 1Password `op://` and `op run -- docker compose …` in prod.
- One Compose stack per app; `docker-compose.prod.yml` pulls GHCR images named
  `<app>-<service>`. Back up the `pb_data` volume.
- CI (`.github/workflows/docker.yml`) builds + pushes images on `main` / tags.

## Naming

- Repos `walaware/<app>`; packages `@walaware/<app>-<part>`
  (`-web`, `-core`, `-worker`, `-mcp`); GHCR images `<app>-<service>`.

## Licensing

Apps → **AGPL-3.0**; shared libraries → **MIT**. See
[DOCUMENTATION.md §5](../DOCUMENTATION.md).
