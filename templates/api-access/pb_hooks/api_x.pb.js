/// <reference path="../pb_data/types.d.ts" />

// walaware API Access — the curated, versioned API surface (`/api/x/v1/*`).
//
// This is the ONLY programmatic door into an app's data for external consumers.
// It exists so internal schema churn (renamed fields, split collections) never
// breaks a consumer: routes return a STABLE, documented payload, not raw records.
//
// Contract for every route below:
//   1. `$apis.requireAuth("api_clients")` — only a live api_clients token gets in.
//      (authRule "active = true" means a revoked client is rejected here.)
//   2. `requireScope(e, "<scope>")` — the client's `scopes` must include it.
//   3. Shape the payload explicitly — never `return e.json(200, record)`.
//   4. `audit(e, scope)` — one structured log line per call.
//
// `x` = the external/curated namespace, deliberately separate from PocketBase's
// own `/api/collections/*`. The tailnet Caddy site proxies ONLY `/api/x/*`
// (see templates/api-access/Caddyfile.snippet) — the raw records API and the
// `/_/` admin UI are never reachable off-host.
//
// Copy this into an app's pocketbase/pb_hooks/. Replace the example routes with
// the app's real surface, and keep docs/for-api.md in lockstep with what's here.

// ---------------------------------------------------------------------------
// The API SURFACE manifest — the single source of truth for what a scope grants.
// Read scopes list the collections + fields a consumer may see. Write scopes are
// a separate, narrower allowlist. Both are enforced in code below; docs/for-api.md
// documents this same table for consumers. Keep the three in sync.
// ---------------------------------------------------------------------------
const API_SURFACE = {
  version: "v1",
  read: {
    // "example:read": { collection: "example", fields: ["id", "title", "status"] },
  },
  write: {
    // "example:write": { collection: "example", fields: ["note"] },
  },
}

// ---------------------------------------------------------------------------
// Helpers (defined per-file; pb_hooks files each run in their own scope).
// ---------------------------------------------------------------------------

/** Reject the request unless the authed client holds `scope`. */
function requireScope(e, scope) {
  const client = e.auth
  if (!client) {
    throw new ApiError(401, "authentication required")
  }
  let scopes = []
  try {
    scopes = client.get("scopes") || []
  } catch (_) {
    scopes = []
  }
  if (!Array.isArray(scopes) || scopes.indexOf(scope) === -1) {
    // 403, and log the denial — a client probing beyond its grant is a signal.
    e.app.logger().warn(
      "api.x scope denied",
      "client", client.id,
      "name", client.getString("name"),
      "instance", client.getString("instance"),
      "scope", scope,
    )
    throw new ApiError(403, "scope '" + scope + "' not granted")
  }
}

/** One structured audit line per served call. */
function audit(e, scope) {
  e.app.logger().info(
    "api.x access",
    "client", e.auth.id,
    "name", e.auth.getString("name"),
    "instance", e.auth.getString("instance"),
    "scope", scope,
    "method", e.request.method,
    "path", e.request.url.path,
  )
}

/** For multi-instance apps: the instance this token is bound to (or ""). */
function clientInstance(e) {
  return e.auth.getString("instance")
}

// ---------------------------------------------------------------------------
// Meta route — lets a consumer discover the surface it can reach. No data.
// ---------------------------------------------------------------------------
routerAdd("GET", "/api/x/v1/whoami", (e) => {
  audit(e, "whoami")
  return e.json(200, {
    client: e.auth.getString("name"),
    instance: e.auth.getString("instance") || null,
    scopes: e.auth.get("scopes") || [],
    api_version: API_SURFACE.version,
  })
}, $apis.requireAuth("api_clients"))

// ---------------------------------------------------------------------------
// EXAMPLE read route — copy the shape, delete the example.
//
//   GET /api/x/v1/example?limit=50
//
// routerAdd("GET", "/api/x/v1/example", (e) => {
//   requireScope(e, "example:read")
//   const limit = Math.min(parseInt(e.request.url.query().get("limit") || "50", 10), 200)
//   const records = e.app.findRecordsByFilter(
//     "example",
//     "status = 'active'" + (clientInstance(e) ? " && instance = {:inst}" : ""),
//     "-created",
//     limit,
//     0,
//     { inst: clientInstance(e) },
//   )
//   const items = records.map((r) => ({
//     id: r.id,
//     title: r.getString("title"),
//     status: r.getString("status"),
//     updated: r.getString("updated"),
//   }))
//   audit(e, "example:read")
//   return e.json(200, { items, count: items.length })
// }, $apis.requireAuth("api_clients"))

// ---------------------------------------------------------------------------
// EXAMPLE write route — narrow, curated mutation. Copy the shape, delete it.
//
//   POST /api/x/v1/example/{id}/note   body: { "note": "…" }
//
// routerAdd("POST", "/api/x/v1/example/{id}/note", (e) => {
//   requireScope(e, "example:write")
//   const id = e.request.pathValue("id")
//   const body = new DynamicModel({ note: "" })
//   e.bindBody(body)
//   if (!body.note || body.note.length > 500) {
//     throw new ApiError(400, "note is required and must be <= 500 chars")
//   }
//   const record = e.app.findRecordById("example", id)
//   if (clientInstance(e) && record.getString("instance") !== clientInstance(e)) {
//     throw new ApiError(404, "not found")   // don't leak cross-instance existence
//   }
//   record.set("note", body.note)
//   e.app.save(record)
//   audit(e, "example:write")
//   return e.json(200, { id: record.id, note: record.getString("note") })
// }, $apis.requireAuth("api_clients"))
