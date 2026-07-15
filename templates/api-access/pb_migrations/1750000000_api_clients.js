/// <reference path="../pb_data/types.d.ts" />

// walaware API Access — the token identity model.
//
// Creates the `api_clients` auth collection. One record = one scoped, revocable
// API token identity. This is NOT a superuser — it can do nothing on its own; the
// curated `/api/x/*` hook routes (see pb_hooks/api_x.pb.js) are the only thing
// that reads its `scopes` and acts on its behalf.
//
// Copy this into an app's pocketbase/pb_migrations/, RENUMBER the prefix so it
// runs BEFORE the final `lock_rules` migration, and edit the seed scopes for the
// app. See templates/api-access/README.md and docs/api-access.md.

migrate((app) => {
  const collection = new Collection({
    type: "auth",
    name: "api_clients",

    // No interactive login for these identities. Tokens are minted by the app
    // server (superuser) via the impersonate endpoint — never by password/OAuth.
    passwordAuth: { enabled: false },
    oauth2: { enabled: false },
    otp: { enabled: false },
    mfa: { enabled: false },

    // Default token lifetime for records of this collection. `impersonate` can
    // override per-token, but this is the ceiling for a plain auth-refresh.
    // 63072000s = 730 days.
    authToken: { duration: 63072000 },

    // authRule gates any auth *flow* to active clients. NOTE: PocketBase 0.39.4
    // does NOT re-run authRule on every request for an already-issued impersonate
    // token (requireAuth only verifies the signature) — so `active = false` alone
    // does NOT reject an outstanding token. Instant revoke is enforced IN-ROUTE by
    // lib.requireActive() in api_x.pb.js (every curated route passes through it).
    // Cryptographic invalidation of a token is `api-token.sh rotate` (tokenKey).
    authRule: "active = true",
    manageRule: null,

    // The collection itself is superuser-only, like every other collection
    // (the final lock_rules migration would do this anyway — we set it explicitly
    // so this migration is self-contained). Only the app server mints/rotates.
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,

    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        max: 100,
        // Human label: "shopwala-analytics-dashboard", "tripwala-concierge-bot".
      },
      {
        name: "scopes",
        type: "json",
        required: true,
        // Array of scope strings, e.g. ["listings:read", "deals:write"].
        // The curated routes check requested scope ⊆ this list. Least-privilege:
        // grant only what the consumer actually calls. Never grant "*".
      },
      {
        name: "instance",
        type: "text",
        max: 100,
        // For multi-instance apps (e.g. a shopwala tenant): which instance this
        // token is scoped to. One client record per instance — never a shared
        // token across tenants. Blank for single-instance apps.
      },
      {
        name: "active",
        type: "bool",
        // Flip to false to revoke instantly (see authRule above).
      },
      {
        name: "note",
        type: "text",
        max: 500,
        // Who holds it, why it was issued, rotation date — for the audit trail.
      },
    ],

    indexes: [
      "CREATE UNIQUE INDEX idx_api_clients_name ON api_clients (name)",
    ],
  })

  app.save(collection)

  // Seed one disabled example client so the shape is visible in the admin UI.
  // EDIT the scopes for the app; leave `active = false` until a real token is
  // minted with scripts/api-token.sh.
  const seed = new Record(collection)
  seed.set("name", "example-consumer")
  seed.set("scopes", ["example:read"])
  seed.set("active", false)
  seed.set("note", "Template seed — edit scopes, then mint a token via scripts/api-token.sh.")
  // Auth records need email + a random password even when passwordAuth is off.
  seed.set("email", "example-consumer@api.invalid")
  seed.setRandomPassword()
  app.save(seed)
}, (app) => {
  const collection = app.findCollectionByNameOrId("api_clients")
  app.delete(collection)
})
