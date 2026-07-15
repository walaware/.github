#!/usr/bin/env bash
# walaware API Access — mint / rotate / revoke scoped API tokens.
#
# Tokens are minted by the app server acting as superuser, via PocketBase's
# `impersonate` endpoint — never by giving a consumer a password. The token is a
# long-lived JWT bound to one `api_clients` record (its scopes, its instance).
# NEVER mint against `_superusers`.
#
# Superuser credentials come from the environment (resolve via 1Password `op://`
# like every other secret — see docs/conventions.md "Secrets & deploy"):
#   PB_URL                  e.g. http://127.0.0.1:8090   (talk to PB directly, on-host)
#   PB_SUPERUSER_EMAIL
#   PB_SUPERUSER_PASSWORD
#
# Usage:
#   api-token.sh create <name> <scopes-csv> [instance]   # new client + token
#   api-token.sh mint   <name> [duration-seconds]        # (re)mint a token for an existing client
#   api-token.sh rotate <name> [duration-seconds]        # new token key + fresh token (old tokens die)
#   api-token.sh revoke <name>                            # active=false — instant, permanent
#   api-token.sh list                                     # all clients + scopes + status
#
# Examples:
#   api-token.sh create shopwala-dashboard "listings:read,deals:read" tenant-acme
#   api-token.sh rotate shopwala-dashboard
#   api-token.sh revoke shopwala-dashboard
#
set -euo pipefail

PB_URL="${PB_URL:-http://127.0.0.1:8090}"
DEFAULT_DURATION="${DEFAULT_DURATION:-31536000}"   # 365 days
COLLECTION="api_clients"

need() { command -v "$1" >/dev/null 2>&1 || { echo "error: '$1' is required" >&2; exit 1; }; }
need curl
need jq

die() { echo "error: $*" >&2; exit 1; }

superuser_token() {
  : "${PB_SUPERUSER_EMAIL:?set PB_SUPERUSER_EMAIL}"
  : "${PB_SUPERUSER_PASSWORD:?set PB_SUPERUSER_PASSWORD}"
  curl -fsS "${PB_URL}/api/collections/_superusers/auth-with-password" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg id "$PB_SUPERUSER_EMAIL" --arg pw "$PB_SUPERUSER_PASSWORD" \
          '{identity:$id, password:$pw}')" \
    | jq -r '.token'
}

# Print the api_clients record id for a given name, or empty.
client_id() {
  local tok="$1" name="$2"
  curl -fsS -G "${PB_URL}/api/collections/${COLLECTION}/records" \
    -H "Authorization: ${tok}" \
    --data-urlencode "filter=name='${name}'" \
    --data-urlencode "perPage=1" \
    | jq -r '.items[0].id // empty'
}

# Impersonate a client record -> long-lived token. Echoes the token.
impersonate() {
  local tok="$1" id="$2" duration="$3"
  curl -fsS "${PB_URL}/api/collections/${COLLECTION}/impersonate/${id}" \
    -H "Authorization: ${tok}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --argjson d "$duration" '{duration:$d}')" \
    | jq -r '.token'
}

cmd="${1:-}"; shift || true

case "$cmd" in
  create)
    name="${1:?name}"; scopes_csv="${2:?scopes-csv}"; instance="${3:-}"
    tok="$(superuser_token)"
    [ -z "$(client_id "$tok" "$name")" ] || die "client '$name' already exists (use mint/rotate)"
    scopes_json="$(jq -cn --arg s "$scopes_csv" '$s | split(",") | map(gsub("^\\s+|\\s+$";""))')"
    pw="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
    id="$(curl -fsS "${PB_URL}/api/collections/${COLLECTION}/records" \
      -H "Authorization: ${tok}" -H 'Content-Type: application/json' \
      -d "$(jq -n --arg n "$name" --argjson sc "$scopes_json" --arg inst "$instance" \
            --arg email "${name}@api.invalid" --arg pw "$pw" \
            '{name:$n, scopes:$sc, instance:$inst, active:true, email:$email, password:$pw, passwordConfirm:$pw}')" \
      | jq -r '.id')"
    [ -n "$id" ] || die "failed to create client"
    token="$(impersonate "$tok" "$id" "$DEFAULT_DURATION")"
    echo "client:   $name  (id $id)"
    echo "scopes:   $scopes_csv"
    [ -n "$instance" ] && echo "instance: $instance"
    echo "token:    $token"
    echo
    echo "Store it as <APP>_API_TOKEN in 1Password now — it is not recoverable."
    ;;

  mint)
    name="${1:?name}"; duration="${2:-$DEFAULT_DURATION}"
    tok="$(superuser_token)"
    id="$(client_id "$tok" "$name")"; [ -n "$id" ] || die "no client named '$name'"
    impersonate "$tok" "$id" "$duration"
    ;;

  rotate)
    # New random password => PocketBase regenerates the record's tokenKey =>
    # every previously-issued token for this client is invalidated. Then mint fresh.
    name="${1:?name}"; duration="${2:-$DEFAULT_DURATION}"
    tok="$(superuser_token)"
    id="$(client_id "$tok" "$name")"; [ -n "$id" ] || die "no client named '$name'"
    pw="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
    curl -fsS -X PATCH "${PB_URL}/api/collections/${COLLECTION}/records/${id}" \
      -H "Authorization: ${tok}" -H 'Content-Type: application/json' \
      -d "$(jq -n --arg pw "$pw" '{password:$pw, passwordConfirm:$pw}')" >/dev/null
    token="$(impersonate "$tok" "$id" "$duration")"
    echo "rotated '$name' — prior tokens are now invalid."
    echo "token: $token"
    echo "Update <APP>_API_TOKEN in 1Password."
    ;;

  revoke)
    name="${1:?name}"
    tok="$(superuser_token)"
    id="$(client_id "$tok" "$name")"; [ -n "$id" ] || die "no client named '$name'"
    curl -fsS -X PATCH "${PB_URL}/api/collections/${COLLECTION}/records/${id}" \
      -H "Authorization: ${tok}" -H 'Content-Type: application/json' \
      -d '{"active":false}' >/dev/null
    echo "revoked '$name' — active=false. All its tokens are rejected immediately."
    ;;

  list)
    tok="$(superuser_token)"
    curl -fsS -G "${PB_URL}/api/collections/${COLLECTION}/records" \
      -H "Authorization: ${tok}" --data-urlencode "perPage=200" \
      | jq -r '.items[] | "\(.active|if . then "●" else "○" end) \(.name)\t[\(.scopes|join(", "))]\t\(.instance // "")"'
    ;;

  *)
    grep '^#' "$0" | sed 's/^# \{0,1\}//' | sed '1d'
    exit 1
    ;;
esac
