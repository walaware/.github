# walaware API Access standard

> Status: **design** (reference kit ready; apps adopt next)

How every walaware app grants **programmatic backend access** to its data —
scoped, least-privilege, revocable API tokens, never a superuser. The reference
implementation apps copy lives in
[`templates/api-access/`](../templates/api-access/); each app ships a
[`docs/for-api.md`](../templates/api-access/docs/for-api.template.md) documenting
its own surface.

The standard supports **two token modes** — [service tokens](#two-token-modes)
(admin-minted, whole-app, tailnet-only) and [personal keys](#personal-keys-user-self-service)
(user-minted, confined to that user's own data, public-edge). They share one
identity collection and one scope/audit model; they differ in who mints them,
what they can see, and where they're reachable.

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
both without weakening the existing boundary: it adds a **second, narrow door**
beside the superuser one — it does not widen the front one.

## Two token modes

Both modes issue tokens bound to the same `api_clients` identity collection and
run through the same scope, audit, and revoke machinery. What differs is **who
mints, what a token sees, and where it's reachable** — driven by whether the
client record carries a `user` relation.

| | **Service token** | **Personal key** |
| --- | --- | --- |
| `api_clients.user` | unset (null) | set → the owning app user |
| Who mints it | an operator, via [`api-token.sh`](../templates/api-access/scripts/api-token.sh) (superuser) | the user themselves, self-service in-app |
| What it sees | the **whole app** (every row a scope covers) | **only that user's own data** (row-filtered) |
| Writes | whatever the scope allows | **only what that user could do in the UI** (role-mirrored per record) |
| Reachable from | **tailnet-only** (§3) — being on the tailnet is the first defense layer | the **public edge** (§3a) — the token is the sole gate, so extra controls are mandatory |
| Served by | a **PocketBase JS hook** (`api_x.pb.js`) | the **app server** (reuses the app's own authz), for apps that have one |

- **Service tokens** are the original standard: a first-party integration (a bot,
  a dashboard, another service) operated by the app owner. Least-privilege, no
  human behind the token, tailnet as the outer wall. Everything in §§1–5 below is
  the service-token path unless noted.
- **Personal keys** let an app's *end users* create their own key to reach *their
  own* data from an AI chat agent, Claude Code, or a script — from anywhere. A
  personal key can never exceed what its user can already do in the app. See
  [Personal keys](#personal-keys-user-self-service).

Pick by consumer: a first-party integration you run → **service token**; a thing
an end user runs against their own data → **personal key**.

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
  - **Revoke — instant, enforced in-route.** Set `active = false`. PocketBase
    0.39.4 does **not** re-run the collection `authRule` on every request for an
    already-issued impersonate token (`requireAuth` only verifies the signature),
    so `active = false` alone does not reject an outstanding token. The curated
    routes therefore check `active` themselves — `lib.requireActive(e)` runs on
    every `/api/x/*` call — making revoke effective immediately, independent of PB
    token timing. `api-token.sh revoke` belt-and-suspenders it: `active = false`
    **and** a tokenKey reset, so the JWT is also cryptographically dead. (Both
    tripwala and shopwala independently confirmed this against live PB 0.39.4.)
  - **Rotate — cryptographic.** Reset the record's password → PocketBase
    regenerates its `tokenKey` → every previously-issued token is invalidated
    (401) → mint a fresh one. Rotate on a schedule and on any suspected exposure.

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

### PocketBase 0.39.4 JSVM gotchas (baked into the kit)

Three non-obvious JSVM behaviors — found adopting this in tripwala against a live
PB 0.39.4 — that the reference kit already handles. Don't re-litigate them:

- **Handlers are isolated.** A `routerAdd` handler cannot reference file-scope
  helpers/consts (throws `ReferenceError` at request time). Shared helpers + the
  `API_SURFACE` manifest live in `api_x_lib.js` and each handler pulls them via
  `require(`${__hooks}/api_x_lib.js`)`.
- **`json` fields read back as raw bytes.** `record.get('scopes')` returns the
  bytes of the JSON text, not a decoded array — a naïve `indexOf` scope check
  fails closed (403s a *granted* scope). `lib.jsonArray()` decodes bytes → string
  → parse.
- **`active = false` doesn't revoke an issued token** (see §1). Enforced in-route
  by `lib.requireActive()`.

## 3. Network exposure

> This section is the **service-token** path (tailnet-only). Personal keys are
> reached over the **public edge** with the token as the sole gate — see
> [Personal keys → Network](#personal-keys-user-self-service).

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
- **Multi-instance apps** issue **one client record per instance** — a token never
  spans tenants. Two isolation models, both supported:
  - **Separate stack per tenant** (shopwala: one PocketBase + `pb_data` per person).
    Tenants are already isolated at the *database* level (distinct `tokenKey`s), so
    there's no shared `instance` column to filter on. Each deployment sets an
    `<APP>_API_INSTANCE` env var; every route **asserts** the token's `instance`
    label matches it (defense-in-depth + audit clarity) rather than row-filtering.
  - **Shared DB with an `instance` column.** Set the `instance` field on each client
    record and **filter every route by it** so a token only sees its tenant's rows.
  - Naming: `<APP>_<INSTANCE>_API_URL` / `<APP>_<INSTANCE>_API_TOKEN` when a consumer
    talks to more than one.

## Personal keys (user self-service)

The service-token model above hands a first-party integration a whole-app token.
**Personal keys** invert the audience: an app's *end user* mints their own key to
reach *their own* data from an AI chat agent, Claude Code, or a script. The
governing rule is one sentence:

> **A personal key can do exactly what its owner can already do in the app — no
> more. Reads are confined to the user's data; writes are role-mirrored per
> record. The key is not a new capability, it's a headless session as that user.**

This keeps the app's own privacy and authorization model (e.g. tripwala's
invite-first, members-only trips; per-trip `organizer`/`guest` roles) intact:
handing someone a key never lets them see or change anything they couldn't
already see or change by logging in.

### Identity — a `user`-bound client record

Personal keys use the same `api_clients` collection, with three added fields (all
optional, so service tokens are unaffected):

- **`user`** — a relation to the app's `users` collection. **Set** ⇒ this is a
  personal key; the app confines every request to this user. **Unset** ⇒ a
  service token (whole-app), exactly as before.
- **`last_used`** — stamped on each call, so a user can spot a stale or leaked
  key in their key list.
- **`token_prefix`** — the first few chars of the issued token, stored so the UI
  can show *which* key a row is (the full token is shown **once**, at creation,
  and never again).

"All scopes, user-confined" is the sensible **default grant** for a personal key:
list every read+write scope in the record's `scopes`, and let the per-user +
per-role filtering below do the actual narrowing. This is **not** a `*` grant and
**not** a superuser — it's "everything this user could click", enforced request
by request. Fine-grained per-scope personal keys can come later; the field is the
same `scopes` array.

### Authorization — reuse the app's own logic, don't re-implement it

The hard part of a personal key is *writes*: whether a given mutation is allowed
usually depends on the user's role **on that specific record** (in tripwala, a
`guest` may set their own RSVP but only an `organizer` may edit the trip or act on
another person). Re-deriving those rules in a second place is how the API drifts
out of sync with the UI and quietly grants more than a user has.

So: **for apps with an app server in the request path, serve the personal-key API
from the app server and route it through the same authorization helpers the UI
uses.** Concretely:

- Factor the app's per-record authz (is-member? role-on-this-record? may-edit?)
  into a **shared server helper** that *both* the interactive UI actions and the
  API endpoint call. Neither has its own copy of the rules.
- The personal-key surface then executes a request as if the owning user had made
  it in the UI — same loaders (already member-filtered), same write guards
  (already role-checked). "The key can't exceed the user" becomes *structural*,
  not a checklist item.

This is a deliberate divergence from the service-token surface, which lives in a
**PocketBase JS hook** (`api_x.pb.js`): a JSVM hook cannot import the app server's
authz code, and a service token has no user whose role to mirror. Choose by mode:

- **App has an app server + wants personal keys** (tripwala, shopwala) → serve
  `/api/x/v1/*` **from the app server**, reusing app authz. Prefer this.
- **No app server / whole-app service token** → the **PB-hook** curated surface
  (§2) is correct; keep it.

An app can run **both**: the PB-hook surface for its tailnet service token and the
app-server surface for users' personal keys, distinguished by `api_clients.user`.

### Minting — self-service, still no superuser to the user

The user is signed into the app (a normal session). Minting a key never exposes a
superuser token and never lets the browser talk to the datastore directly:

1. The browser calls an **app-server** endpoint (the user is already
   authenticated to it by their session).
2. The app server — which already holds the superuser/datastore client — creates
   an `api_clients` record with `user = <this user's id>`, the default scope grant,
   `active = true`, and stores `token_prefix`.
3. It mints the long-lived token (the `impersonate` endpoint, as in §1) and
   returns the **full token exactly once** for the user to copy.
4. Listing keys returns metadata only (name, prefix, created, last_used); the
   token is never recoverable. Revoke = `active = false` + tokenKey reset (§1),
   surfaced as a button in the user's key list.

Validation on the data plane: the app server verifies an incoming key by loading
its `api_clients` record and confirming `active` (an `authRefresh` against the
record works and gives instant-revoke for free — a reset tokenKey fails refresh),
then resolves `user` and proceeds as that user.

### Network — the public edge, so the token is load-bearing

Personal keys are used from wherever the user's agent runs — usually **not** your
tailnet. So they're reached over the **public edge**, and the scoped, user-confined
token is the *only* gate. Removing the tailnet layer makes these **mandatory**,
not optional:

- **Per-user row filtering on every read**, and **per-record role checks on every
  write** (the two rules above). A missing filter here is a cross-user data leak,
  not just an over-broad token.
- **Expose only `/api/x/*` publicly.** The public edge still **404s** `/_/` and
  `/api/collections/*` — personal keys widen the curated door only, never the raw
  records API or the admin UI.
- **Per-key rate limiting** on the public surface (a leaked key is now internet-
  reachable; cap it).
- **One-time token reveal + `last_used` + `token_prefix`** so users can recognize
  and revoke their own keys.
- **Audit every call** (client, user, scope, method, path) exactly as §5.

`<APP>_API_URL` for a personal key is the app's **public** origin
(`https://<app>.<domain>/api/x/v1`), not the tailnet MagicDNS name.

## Build order (per app)

Follow the checklist in
[`templates/api-access/README.md`](../templates/api-access/README.md).

**Service token (tailnet):**

1. Ship the `api_clients` migration (self-locks its rules; run it last / before any
   final `lock_rules` sweep).
2. Add the curated `api_x.pb.js` surface + `API_SURFACE` manifest.
3. Define the app's scope vocabulary.
4. Add the tailnet-only Caddy site (`/api/x/*` only).
5. Mint the first token with `api-token.sh`.
6. Document `<APP>_API_URL` / `<APP>_API_TOKEN` in `.env.example`.
7. Write `docs/for-api.md`.
8. Verify: scoped read works, out-of-scope is 403, revoked token is rejected.
9. Tick the app off in [Adoption](#adoption).

**Personal keys (public edge)** — for apps with an app server:

1. Add `user` / `last_used` / `token_prefix` to the `api_clients` migration.
2. Factor the app's per-record authz (member? role? may-edit?) into a **shared
   server helper** used by both the UI and the API.
3. Serve `/api/x/v1/*` **from the app server**, reusing that helper: reads
   user-filtered, writes role-mirrored.
4. Add a self-service minting endpoint + a **key-management UI** (create with
   one-time reveal, list, revoke).
5. Expose `/api/x/*` on the **public** edge (still 404 `/_/` and
   `/api/collections/*`); add per-key rate limiting.
6. Document the public `<APP>_API_URL` and the personal-key flow in
   `docs/for-api.md`.
7. Verify: user A's key sees only A's data; an action A can't do in the UI is
   403'd; a revoked key is rejected instantly; `/_/` + raw records unreachable
   publicly.
8. Tick the app off in [Adoption](#adoption).

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

Single-instance. **First adopter of personal keys** — an end user mints a key
that reaches only the trips they're a member of, with writes mirrored to their
per-trip `organizer`/`guest` role. Served by the SvelteKit app server (reusing
`lib/server` authz), public edge.

| Scope | Kind | Curated surface (all **user-confined**) |
| --- | --- | --- |
| `trips:read` | read | the user's trips (id, name, dates, status) |
| `trip_ideas:read` | read | the user's trip ideas (id, trip, title, votes) |
| `participants:read` | read | participants of the user's trips (id, trip, name, role) |
| `invitations:read` | read | the user's trip invitations (id, trip, status) |
| `trip_ideas:write` | write | create an idea (any member) |
| `trips:write` | write | edit a trip / add a note — **organizer role required**, per trip |

Default personal-key grant = **all of the above**; the per-user + per-role checks
do the narrowing. A `guest`'s key gets the same 403 on `trips:write` for a trip
they don't organize that the UI would give them.

## Adoption

Track adoption across the app repos here (update as apps ship it):

**Service tokens (tailnet):**

| App | Migration | Curated routes | Tailnet Caddy | `docs/for-api.md` | Status |
| --- | --- | --- | --- | --- | --- |
| tripwala | ☑ | ☑ | ☑ | ☑ | branch `feat/api-access`, verified vs live PB 0.39.4; pending token mint + `tailscale serve` + merge |
| shopwala | ☑ | ☑ | ☑ | ☑ | branch `feat/api-access`, verified vs live PB 0.39.4 (14/14); per-tenant via `SHOPWALA_API_INSTANCE` assertion; pending token mint + `tailscale serve` + merge |
| _next app_ | ☐ | ☐ | ☐ | ☐ | — |

**Personal keys (public edge, user self-service):**

| App | `user`-bound identity | Shared authz helper | App-server surface | Key-mgmt UI | Public Caddy | Status |
| --- | --- | --- | --- | --- | --- | --- |
| tripwala | ☐ | ☐ | ☐ | ☐ | ☐ | in progress — SvelteKit-mediated, being implemented by the tripwala agent |
| _next app_ | ☐ | ☐ | ☐ | ☐ | ☐ | — |

## Security / boundaries

- This standard **must not** weaken the existing invariant: collection API rules
  stay superuser-only and the browser still never talks to PocketBase directly.
  The curated API is a *second*, narrow door, not a loosening of the first.
- A curated route **must not** return a raw record or a superuser-scoped read —
  always an explicit, field-limited payload.
- The tailnet site **must not** proxy `/_/` or `/api/collections/*` — only
  `/api/x/*`. The **public** edge (personal keys) has the same constraint: it
  exposes `/api/x/*` and still 404s `/_/` and `/api/collections/*`.
- No issued token is ever a superuser token, and no token is shared across
  multi-instance tenants.
- **Personal keys** additionally: `api_clients.user` set ⇒ every read is
  user-filtered and every write is role-mirrored to that user — a personal key
  must never see or change data its owner couldn't in the UI. Reuse the app's
  authz helper; don't re-implement it. Default grant is "all scopes,
  user-confined", never `*`/superuser.
