/// <reference path="../pb_data/types.d.ts" />

// walaware API Access — the curated, versioned API surface (`/api/x/v1/*`).
//
// This is the ONLY programmatic door into an app's data for external consumers.
// It exists so internal schema churn (renamed fields, split collections) never
// breaks a consumer: routes return a STABLE, documented payload, not raw records.
//
// Contract for every route below:
//   1. `$apis.requireAuth("api_clients")` (middleware) — only a valid token in.
//   2. `lib.requireScope(e, "<scope>")` — active client + scope granted.
//      (requireScope calls requireActive; use requireActive alone on no-scope
//      routes like /whoami.)
//   3. Shape the payload explicitly — never `return e.json(200, record)`.
//   4. `lib.audit(e, scope)` — one structured log line per call.
//
// JSVM NOTE (load-bearing): a routerAdd handler runs in an ISOLATED context and
// CANNOT reference file-scope helpers/consts — that throws ReferenceError at
// request time. So helpers + the API_SURFACE manifest live in `api_x_lib.js` and
// every handler pulls them via `require(`${__hooks}/api_x_lib.js`)`. Keep it that
// way. Verified against live PocketBase 0.39.4.
//
// `x` = the external/curated namespace, deliberately separate from PocketBase's
// own `/api/collections/*`. The tailnet Caddy site proxies ONLY `/api/x/*`
// (see Caddyfile.snippet) — the raw records API and `/_/` admin are never
// reachable off-host.
//
// Copy this + api_x_lib.js into pocketbase/pb_hooks/. Replace the example routes
// with the app's real surface, and keep docs/for-api.md in lockstep with it.

// ---------------------------------------------------------------------------
// Meta route — lets a consumer discover the surface it can reach. No data.
// ---------------------------------------------------------------------------
routerAdd('GET', '/api/x/v1/whoami', (e) => {
  const lib = require(`${__hooks}/api_x_lib.js`);
  lib.requireActive(e);
  lib.audit(e, 'whoami');
  return e.json(200, {
    client: e.auth.getString('name'),
    instance: e.auth.getString('instance') || null,
    scopes: lib.jsonArray(e.auth.get('scopes')),
    api_version: lib.API_SURFACE.version
  });
}, $apis.requireAuth('api_clients'));

// ---------------------------------------------------------------------------
// EXAMPLE read route — copy the shape, delete the example.
//
//   GET /api/x/v1/example?limit=50
//
// routerAdd('GET', '/api/x/v1/example', (e) => {
//   const lib = require(`${__hooks}/api_x_lib.js`);
//   lib.requireScope(e, 'example:read');
//   const inst = lib.clientInstance(e);
//   const records = e.app.findRecordsByFilter(
//     'example',
//     "status = 'active'" + (inst ? ' && instance = {:inst}' : ''),
//     '-created',
//     lib.readLimit(e),
//     0,
//     { inst },
//   );
//   const items = records.map((r) => ({
//     id: r.id,
//     title: r.getString('title'),
//     status: r.getString('status'),
//     updated: r.getString('updated'),
//   }));
//   lib.audit(e, 'example:read');
//   return e.json(200, { items, count: items.length });
// }, $apis.requireAuth('api_clients'));

// ---------------------------------------------------------------------------
// EXAMPLE write route — narrow, curated mutation. Copy the shape, delete it.
//
//   POST /api/x/v1/example/{id}/note   body: { "note": "…" }
//
// routerAdd('POST', '/api/x/v1/example/{id}/note', (e) => {
//   const lib = require(`${__hooks}/api_x_lib.js`);
//   lib.requireScope(e, 'example:write');
//   const id = e.request.pathValue('id');
//   const body = new DynamicModel({ note: '' });
//   e.bindBody(body);
//   if (!body.note || body.note.length > 500) {
//     throw new ApiError(400, 'note is required and must be <= 500 chars');
//   }
//   const record = e.app.findRecordById('example', id);
//   const inst = lib.clientInstance(e);
//   if (inst && record.getString('instance') !== inst) {
//     throw new ApiError(404, 'not found');   // don't leak cross-instance existence
//   }
//   record.set('note', body.note);
//   e.app.save(record);
//   lib.audit(e, 'example:write');
//   return e.json(200, { id: record.id, note: record.getString('note') });
// }, $apis.requireAuth('api_clients'));
