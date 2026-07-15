# walaware API Access standard

> Status: **design** (reference kit ready; apps adopt next)

How every walaware app grants **programmatic backend access** to its data —
scoped, least-privilege, revocable API tokens, never a superuser. The reference
implementation apps copy lives in
[`templates/api-access/`](../templates/api-access/); each app ships a
[`docs/for-api.md`](../templates/api-access/docs/for-api.template.md) documenting
its own surface.

## Goal

Any external consumer — a script, an integration, an automation, a dashboard,
another service — can read (and do narrow writes against) an app's data over an
API, **without a human login and without full admin rights**. Once an app adopts
this standard, a consumer needs only two things:

```
<APP>_API_URL      e.g. https://shopwala.<tailnet>.ts.net/api/x/v1
<APP>_API_TOKEN    a scoped, revocable token — never a superuser token
```

### Why this is needed (the blocker)

Every walaware app is PocketBase 0.39.4 with **all collection API rules locked to
superuser-only** — the app server itself authenticates as the superuser to
operate (see [architecture.md](architecture.md), "Server-mediated data"). So today
the *only* way to reach app data programmatically is with a superuser token, which
is far too broad to hand to any consumer. Separately, PocketBase runs
container-internal, so there's a network-exposure gap too. This standard closes
both without weakening the existing boundary: it adds a **second, narrow,
tailnet-only door** beside the superuser one — it does not widen the front one.

## Architecture

```
                          PUBLIC EDGE (unchanged)
   internet ── Authentik (shopwala) / files-only Caddy (tripwala) ──▶ web

                          TAILNET-ONLY API DOOR (new)
   consumer ─(tailnet)─▶ Caddy site  ── /api/x/* only ──▶ PocketBase
   <APP>_API_TOKEN            │                              │
                             404s /_/ and /api/collections/* │
                                                             ▼
                                          pb_hooks/api_x.pb.js  (curated surface)
                                              1. requireAuth("api_clients")
                                              2. requireScope(token, "x:read")
                                              3. shape a STABLE payload
                                              4. audit-log the call
                                                             │
                                        reads/writes as PB   ▼
                                          api_clients ── scopes ──▶ collections
                                          (auth collection, NOT superuser)

   minting:  app server (superuser) ──POST /impersonate/{id}──▶ long-lived token
```

Three moving parts, each a section below: **tokens & auth**, **authorization /
scopes**, **network exposure**. Plus **documentation** and **security posture**.

## 1. Tokens & auth

- **Identity: an `api_clients` auth collection.** One record = one API consumer
  identity carrying its scopes. It is a normal PocketBase `auth` collection — **not
  a superuser** — so a token minted for it can do nothing except what the curated
  routes allow. Interactive login (password/OAuth/OTP) is disabled; tokens are
  minted server-side only.
- **Minting: the `impersonate` endpoint.** The app server (authenticated as
  superuser) calls
  `POST /api/collections/api_clients/impersonate/{id}` with a `duration`, and
  PocketBase returns a **long-lived token** bound to that record. No password is
  ever shared with the consumer. See
  [`scripts/api-token.sh`](../templates/api-access/scripts/api-token.sh).
- **Env-var convention.** Every first-party consumer configures exactly:
  `<APP>_API_URL` and `<APP>_API_TOKEN` (uppercased app name). Stored as
  1Password `op://` refs like every other secret — never committed.
- **Rotation & revocation** (both in `api-token.sh`):
  - **Revoke — instant.** Set `active = false`. The collection's
    `authRule = "active = true"` is re-checked on *every* token verification, so
    all outstanding tokens for that client are rejected immediately — no waiting
    for expiry.
  - **Rotate.** Reset the record's password → PocketBase regenerates its
    `tokenKey` → every previously-issued token is cryptographically invalidated →
    mint a fresh one. Rotate on a schedule and on any suspected exposure.

## 2. Authorization / scopes

The default and strongly-preferred access path is a **curated, versioned API
surface**, not raw collections — so internal schema churn (renamed fields, split
collections) never breaks a consumer.

- **Curated hook routes.** Each app exposes `/api/x/v1/*` routes from a PocketBase
  JS hook ([`pb_hooks/api_x.pb.js`](../templates/api-access/pb_hooks/api_x.pb.js)).
  Every route: `requireAuth("api_clients")` → `requireScope(...)` → returns an
  **explicit, documented payload** (never a raw record) → audit-logs the call.
  `v1` in the path lets the surface evolve without breaking existing consumers.
- **Scopes are two separate allowlists.** A per-app **read** allowlist (which
  collections/fields a token may see) and a separate, **narrower write** allowlist
  (which specific mutations it may make). A read token can never write. Scope
  strings are `<domain>:read` / `<domain>:write` (e.g. `listings:read`,
  `deals:write`). A client's `scopes` JSON field lists exactly what it holds;
  routes check `requested ⊆ granted`. Never grant `*`.
- **How an app declares its scopes.** In one place — the `API_SURFACE` manifest at
  the top of `api_x.pb.js` — mapping each scope to the collection + fields it
  exposes. `docs/for-api.md` documents the *same* table for consumers. The two are
  kept in lockstep.
- **Raw collection rules are an escape hatch, not the norm.** Prefer curated
  routes. If an app ever must expose a collection directly, it does so with an
  explicit, field-limited rule referencing the `api_clients` identity — still never
  superuser — and documents it as such. Curated-first keeps the consumer contract
  stable.

## 3. Network exposure

- **Public edge unchanged.** Whatever an app exposes publicly stays exactly as is
  — Authentik in front of shopwala; the tripwala Caddy that exposes only
  `/api/files/*`. This standard does not touch it.
- **The API is a separate, tailnet-only path.** A dedicated Caddy site (or
  `tailscale serve`) bound to the trusted tailnet proxies **only** `/api/x/*` —
  the `/_/` admin UI and the raw `/api/collections/*` API are **never** reachable
  on it. See
  [`Caddyfile.snippet`](../templates/api-access/Caddyfile.snippet). PocketBase
  stays container-internal; the tailnet site is the only new listener.
- **The URL is the env var.** `<APP>_API_URL` is
  `https://<app>.<tailnet>.ts.net/api/x/v1` (MagicDNS). Being on the tailnet is
  itself the first layer of defense; the scoped token is the second.

## 4. Documentation

Every adopting app ships **`docs/for-api.md`** (the canonical path) from the
[template](../templates/api-access/docs/for-api.template.md): available endpoints,
readable/writable collections & fields, the scope table, example `curl` requests,
and how to obtain/rotate a token. It's linked from the app README's "How it works".

## 5. Security posture

- **Least-privilege by default.** A token gets only the scopes asked for and
  justified. No `*`, no "read everything".
- **Per-scope allowlisting**, reads and writes separate (§2).
- **No superuser in any issued token — ever.** Tokens are bound to `api_clients`,
  which has no admin rights and cannot reach `/_/`.
- **Revocable & rotatable** instantly (§1).
- **Audit/logging.** Every curated call logs one structured line — client, scope,
  method, path — plus a `warn` on any scope denial. Denials are a probing signal.
- **Multi-instance apps** (e.g. shopwala's per-tenant instances) issue **one client
  record per instance**, with the `instance` field set and enforced in every
  route's filter — a token never spans tenants. Naming:
  `<APP>_<INSTANCE>_API_URL` / `<APP>_<INSTANCE>_API_TOKEN` when a consumer talks
  to more than one.

## Build order (per app)

Follow the checklist in
[`templates/api-access/README.md`](../templates/api-access/README.md):

1. Ship the `api_clients` migration (before `lock_rules`).
2. Add the curated `api_x.pb.js` surface + `API_SURFACE` manifest.
3. Define the app's scope vocabulary.
4. Add the tailnet-only Caddy site (`/api/x/*` only).
5. Mint the first token with `api-token.sh`.
6. Document `<APP>_API_URL` / `<APP>_API_TOKEN` in `.env.example`.
7. Write `docs/for-api.md`.
8. Verify: scoped read works, out-of-scope is 403, revoked token is rejected.
9. Tick the app off in [Adoption](#adoption).

## Named first adopters (example scopes)

### shopwala

Multi-instance (per-tenant). One `api_clients` record **per instance**.

| Scope | Kind | Curated surface |
| --- | --- | --- |
| `listings:read` | read | active listings (title, price_cents, currency, status, updated) |
| `deals:read` | read | pending deals (id, listing, stage, buyer_ref, updated) |
| `matches:read` | read | buyer matches (id, listing, score, buyer_ref) |
| `deals:write` | write | set a deal's status |
| `listings:write` | write | add/replace a listing note |
| `watch:write` | write | snooze a watch |

### tripwala

Single-instance.

| Scope | Kind | Curated surface |
| --- | --- | --- |
| `trips:read` | read | trips (id, name, dates, status) |
| `trip_ideas:read` | read | trip ideas (id, trip, title, votes) |
| `participants:read` | read | participants (id, trip, name, role) |
| `invitations:read` | read | trip invitations (id, trip, status) |
| `trip_ideas:write` | write | create a trip idea |
| `trips:write` | write | add a note to a trip |

## Adoption

Track adoption across the app repos here (update as apps ship it):

| App | Migration | Curated routes | Tailnet Caddy | `docs/for-api.md` | Status |
| --- | --- | --- | --- | --- | --- |
| tripwala | ☐ | ☐ | ☐ | ☐ | not started |
| shopwala | ☐ | ☐ | ☐ | ☐ | not started |
| _next app_ | ☐ | ☐ | ☐ | ☐ | — |

## Security / boundaries

- This standard **must not** weaken the existing invariant: collection API rules
  stay superuser-only and the browser still never talks to PocketBase directly.
  The curated API is a *second*, narrow door, not a loosening of the first.
- A curated route **must not** return a raw record or a superuser-scoped read —
  always an explicit, field-limited payload.
- The tailnet site **must not** proxy `/_/` or `/api/collections/*` — only
  `/api/x/*`.
- No issued token is ever a superuser token, and no token is shared across
  multi-instance tenants.
