# <app> API

> Status: **design** (not yet built)   <!-- design | drafted | built -->

Programmatic, read-and-limited-write access to <app>'s data over a scoped API
token — no human login, no superuser. Part of the suite-wide
[API Access standard](https://github.com/walaware/.github/blob/main/docs/api-access.md).

## The consumer contract

Once you have a token, you need exactly two things:

```bash
export <APP>_API_URL="https://<app>.<tailnet>.ts.net/api/x/v1"
export <APP>_API_TOKEN="<your scoped token>"

curl -H "Authorization: $<APP>_API_TOKEN" "$<APP>_API_URL/whoami"
```

- **Tailnet only.** The API is reachable **only over the trusted tailnet**, not
  the public edge. You must be on the tailnet (Tailscale) to reach `<APP>_API_URL`.
- **`Authorization: <token>`** — the raw token, no `Bearer` prefix (PocketBase
  convention).
- Every response is JSON. Errors are `{ "status", "message" }` with a 4xx/5xx code.

## Scopes

A token carries a fixed set of scopes. Reads and writes are **separate**
allowlists — a read token cannot write.

| Scope | Kind | Grants |
| --- | --- | --- |
| `<domain>:read` | read | <what it exposes> |
| `<domain>:write` | write | <the narrow mutation it allows> |

## Endpoints

> The payloads below are the **stable contract** — internal collections/fields may
> change underneath; these shapes will not (within `v1`).

### `GET /whoami`

Returns your client name, instance, and granted scopes. No scope required.

### `GET /<resource>` — scope `<domain>:read`

<One line: what it returns.> Query params: `limit` (default 50, max 200).

```json
{ "items": [ { "id": "…", "…": "…" } ], "count": 1 }
```

### `POST /<resource>/{id}/<action>` — scope `<domain>:write`

<One line: what it mutates.> Body:

```json
{ "…": "…" }
```

## Getting & rotating a token

Tokens are minted by the <app> operator, not self-served:

- **Request one** with the scopes and (for multi-instance) the instance you need.
- The operator runs `scripts/api-token.sh create <name> "<scopes>" [instance]` and
  hands you the token over a secure channel. Store it in your own secret manager.
- **Rotation:** the operator runs `api-token.sh rotate <name>` — your old token
  stops working immediately and you get a fresh one. Rotate on a schedule and on
  any suspected exposure.
- **Revocation:** `api-token.sh revoke <name>` disables the token instantly.

## Security notes

- Least-privilege: you only get the scopes you asked for and justified.
- No token ever carries superuser rights or reaches the `/_/` admin UI or the raw
  `/api/collections/*` API.
- Every call is audit-logged (client, scope, route) server-side.
- Multi-instance <app>: each instance has its **own** token; a token never spans
  instances.
