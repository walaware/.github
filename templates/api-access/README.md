# API Access — reference implementation (apps copy this)

The drop-in kit for adopting the walaware
[API Access standard](../../docs/api-access.md). Copy these into an app, edit the
app-specific bits, ship the migration. The goal: a consumer needs only
`<APP>_API_URL` + a scoped `<APP>_API_TOKEN`, and nothing about the app's public
edge or superuser boundary changes.

## What's in the kit

| File | Copies to | Role |
| --- | --- | --- |
| `pb_migrations/1750000000_api_clients.js` | `pocketbase/pb_migrations/` (renumber) | The `api_clients` scoped-token identity collection. |
| `pb_hooks/api_x.pb.js` | `pocketbase/pb_hooks/` | The curated, versioned `/api/x/v1/*` surface + scope guard + audit log. |
| `scripts/api-token.sh` | `scripts/` | Mint / rotate / revoke tokens via the impersonate endpoint. |
| `Caddyfile.snippet` | fold into the app's tailnet Caddy site | Expose **only** `/api/x/*`, tailnet-only. |
| `docs/for-api.template.md` | `docs/for-api.md` | The consumer-facing API doc. |

## Adoption checklist

- [ ] **1. Identity.** Copy the migration into `pocketbase/pb_migrations/`,
      **renumber** its prefix so it runs *before* the final `lock_rules`
      migration. Edit the seed's example scopes. `docker compose up` and confirm
      the `api_clients` collection appears.
- [ ] **2. Surface.** Copy `pb_hooks/api_x.pb.js`. Fill in `API_SURFACE` and
      replace the example routes with the app's real curated read/write routes.
      Reads and writes are **separate** scope allowlists. Return explicit payloads
      — never a raw record.
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
  in JS hooks, `authRule = "active = true"` for instant revocation.
- Nothing here weakens the existing invariant: collection rules stay superuser-only
  and the browser still never talks to PocketBase directly. This adds a *second*,
  narrow, tailnet-only door — it doesn't widen the front one.
