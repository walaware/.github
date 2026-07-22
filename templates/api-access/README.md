# API Access — reference implementation (apps copy this)

The drop-in kit for adopting the walaware
[API Access standard](../../docs/api-access.md). Copy these into an app, edit the
app-specific bits, ship the migration. The goal: a consumer needs only
`<APP>_API_URL` + a scoped `<APP>_API_TOKEN`, and nothing about the app's public
edge or superuser boundary changes.

## Two modes — read this first

The standard has **two token modes** ([full explanation](../../docs/api-access.md#two-token-modes)).
This kit is the **service-token** reference (admin-minted, whole-app, tailnet-only,
served by a PocketBase hook). If you want **personal keys** (an end user mints a
key for *their own* data, reachable from the public edge), the pieces below still
apply — the same `api_clients` collection (with the `user`/`last_used`/`token_prefix`
fields already in the migration) — but the *surface* is different: you serve
`/api/x/v1/*` **from the app server**, reusing the app's own authz helper, instead
of from `api_x.pb.js`. See
[docs/api-access.md → Personal keys](../../docs/api-access.md#personal-keys-user-self-service)
for that pattern; there's no drop-in hook for it because it's app-server code that
must call *your* authz. An app can run both modes at once.

## What's in the kit

| File | Copies to | Role |
| --- | --- | --- |
| `pb_migrations/1750000000_api_clients.js` | `pocketbase/pb_migrations/` (renumber) | The `api_clients` scoped-token identity collection. |
| `pb_hooks/api_x.pb.js` | `pocketbase/pb_hooks/` | The curated, versioned `/api/x/v1/*` routes. |
| `pb_hooks/api_x_lib.js` | `pocketbase/pb_hooks/` | Shared helpers + `API_SURFACE` manifest, `require()`'d by the routes (JSVM handlers can't use file-scope helpers). |
| `scripts/api-token.sh` | `scripts/` | Mint / rotate / revoke tokens via the impersonate endpoint. |
| `Caddyfile.snippet` | fold into the app's tailnet Caddy site | Expose **only** `/api/x/*`, tailnet-only. |
| `docs/for-api.template.md` | `docs/for-api.md` | The consumer-facing API doc. |

## Adoption checklist

- [ ] **1. Identity.** Copy the migration into `pocketbase/pb_migrations/` and
      **renumber** its prefix to run last. The migration **self-locks** its own
      rules to superuser-only, so it's correct whether the app ends with a single
      `lock_rules` sweep (run before it) or has collections self-lock as they're
      created (just run last). Confirm `api_clients` ends up superuser-only. Edit
      the seed's example scopes; `docker compose up` and confirm it appears.
- [ ] **2. Surface.** Copy `pb_hooks/api_x.pb.js` **and** `pb_hooks/api_x_lib.js`.
      Fill in `API_SURFACE` (in the lib) and replace the example routes with the
      app's real curated read/write routes. Reads and writes are **separate** scope
      allowlists. Return explicit payloads — never a raw record. Keep helpers in the
      `require()`'d lib — JSVM handlers can't reference file-scope helpers.
- [ ] **3. Scopes.** Define the app's scope vocabulary (`<domain>:read` /
      `<domain>:write`) in `API_SURFACE` and in `docs/for-api.md`. Keep them
      identical.
- [ ] **4. Network.** Add a **tailnet-only** Caddy site (see `Caddyfile.snippet`)
      that proxies only `/api/x/*`. Do **not** touch the public edge (Authentik /
      the files-only Caddy). Confirm `/api/x/v1/whoami` works over the tailnet and
      that `/_/` and `/api/collections/*` are **not** reachable there.
- [ ] **5. Tokens.** Add superuser creds to the app's 1Password item
      (`PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`). Mint the first token:
      `scripts/api-token.sh create <name> "<scopes>" [instance]`.
- [ ] **6. Env convention.** Document `<APP>_API_URL` +`<APP>_API_TOKEN` in
      `.env.example` (as `op://` refs) for any first-party consumer.
- [ ] **7. Docs.** Copy `docs/for-api.template.md` → `docs/for-api.md`, fill in the
      real endpoints/scopes/examples. Link it from the app README's "How it works".
- [ ] **8. Verify.** `pnpm check` + `pnpm build` still clean; a scoped token can
      read its allowed data and is **403'd** outside its scopes; a revoked token is
      rejected immediately.
- [ ] **9. Track adoption.** Tick the app off in
      [`docs/api-access.md` → Adoption](../../docs/api-access.md#adoption).

## Notes

- These are **PocketBase 0.39.4** patterns: an `auth` collection minted via the
  `impersonate` endpoint for long-lived tokens, `$apis.requireAuth` + a scope check
  in JS hooks. Instant revoke is enforced **in-route** (`requireActive`), not by
  `authRule` — PB doesn't re-run authRule per request for issued tokens; `rotate`
  (tokenKey) is the cryptographic invalidation. See the JSVM gotchas in
  [`../../docs/api-access.md`](../../docs/api-access.md).
- Nothing here weakens the existing invariant: collection rules stay superuser-only
  and the browser still never talks to PocketBase directly. This adds a *second*,
  narrow, tailnet-only door — it doesn't widen the front one.
