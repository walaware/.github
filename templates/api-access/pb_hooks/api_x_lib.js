/// <reference path="../pb_data/types.d.ts" />

// walaware API Access — shared helpers + surface manifest for api_x.pb.js.
//
// IMPORTANT (PocketBase 0.39 JSVM execution model): a `routerAdd` handler runs
// in an ISOLATED context and CANNOT close over file-scope variables/functions of
// the hook file — referencing them throws `ReferenceError` at request time. So
// the shared helpers and the manifest live HERE, in a plain (non-`.pb.js`)
// CommonJS module, and each handler pulls them in with:
//   const lib = require(`${__hooks}/api_x_lib.js`)
// This file is NOT a `*.pb.js` hook, so PocketBase does not auto-run it — it is
// only loaded via require().
//
// Verified against live PocketBase 0.39.4. Copy alongside api_x.pb.js.

// ---------------------------------------------------------------------------
// The API SURFACE manifest — the single source of truth for what a scope grants.
// Kept in lockstep with docs/for-api.md. Reads and writes are separate allowlists.
// Fill in with the app's real scopes → collections/fields.
// ---------------------------------------------------------------------------
const API_SURFACE = {
  version: 'v1',
  read: {
    // 'example:read': { collection: 'example', fields: ['id', 'title', 'status'] },
  },
  write: {
    // 'example:write': { collection: 'example', fields: ['note'] },
  }
};

/**
 * Read a `json` field into a native JS array. In PocketBase's JSVM (0.39.4) a
 * json field comes back as `types.JSONRaw` — a byte array of the raw JSON text
 * (e.g. the bytes of `["a"]`), NOT a decoded array. `e.json` serializes it
 * specially, but `Array.isArray`/`indexOf` see the bytes. Decode: bytes →
 * string → parse. Tolerates an already-decoded array or a JSON string too.
 */
function jsonArray(v) {
  if (v == null) return [];
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch (_) { return []; }
  }
  if (Array.isArray(v)) {
    // A JSONRaw byte array is all numbers; a real decoded array is not.
    if (v.length && v.every((n) => typeof n === 'number')) {
      try { return JSON.parse(String.fromCharCode.apply(null, v)); } catch (_) { return []; }
    }
    return v;
  }
  return [];
}

/**
 * Reject an inactive (revoked) client. PocketBase's `requireAuth` verifies a
 * token's signature but does NOT re-run the collection `authRule` ("active =
 * true") on every request, so an already-issued impersonate token survives a
 * plain `active = false` flip. Every curated route passes through here, so we
 * enforce `active` ourselves — making `api-token.sh revoke` (active=false) an
 * INSTANT revoke, independent of PB's token timing. (`rotate` remains the
 * cryptographic invalidation via a tokenKey change.)
 */
function requireActive(e) {
  if (!e.auth || !e.auth.getBool('active')) {
    e.app.logger().warn('api.x inactive client rejected', 'client', e.auth ? e.auth.id : null);
    throw new ApiError(403, 'client is inactive');
  }
}

/** Reject the request unless the authed client is active AND holds `scope`. */
function requireScope(e, scope) {
  const client = e.auth;
  if (!client) {
    throw new ApiError(401, 'authentication required');
  }
  requireActive(e);
  const scopes = jsonArray(client.get('scopes'));
  if (scopes.indexOf(scope) === -1) {
    // 403, and log the denial — a client probing beyond its grant is a signal.
    e.app.logger().warn(
      'api.x scope denied',
      'client', client.id,
      'name', client.getString('name'),
      'instance', client.getString('instance'),
      'scope', scope
    );
    throw new ApiError(403, "scope '" + scope + "' not granted");
  }
}

/** One structured audit line per served call. */
function audit(e, scope) {
  e.app.logger().info(
    'api.x access',
    'client', e.auth.id,
    'name', e.auth.getString('name'),
    'instance', e.auth.getString('instance'),
    'scope', scope,
    'method', e.request.method,
    'path', e.request.url.path
  );
}

/** For multi-instance apps: the instance this token is bound to (or ''). */
function clientInstance(e) {
  return e.auth.getString('instance');
}

/** Clamp a ?limit= query param to [1, 200], default 50. */
function readLimit(e) {
  const raw = parseInt(e.request.url.query().get('limit') || '50', 10);
  if (isNaN(raw) || raw < 1) return 50;
  return Math.min(raw, 200);
}

/** Minimal HTML-escape for text folded into a rich-text/editor field. */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

module.exports = {
  API_SURFACE, jsonArray, requireScope, requireActive, audit, clientInstance, readLimit, escapeHtml
};
