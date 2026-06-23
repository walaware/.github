# Security policy

Applies to every walaware repository.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Instead, report
privately via [GitHub Security Advisories](https://github.com/walaware) ("Report a
vulnerability" on the affected repo) or by contacting the maintainer directly.

Include: the affected app + version/commit, a description, reproduction steps, and
the impact you foresee. We'll acknowledge, investigate, and coordinate a fix and
disclosure timeline with you.

## Scope & expectations

- These are **self-hostable** apps. Many security properties depend on how an
  operator deploys (reverse proxy, TLS, secret management). Each app's README
  documents its **security model** and the trust boundary it assumes.
- **Secrets** are never committed — they're injected at runtime via 1Password
  (`op://` URIs). If you ever find a committed credential, treat it as exposed:
  report it, and it will be rotated.
- **Server-mediated data access** is a core invariant: the browser never talks to
  PocketBase directly; collection rules are locked to superuser-only and the app
  server scopes every read/write. Bypasses of this are in scope.

## Agent-operated apps

Apps that drive real third-party accounts (e.g. **shopwala** on Facebook
Marketplace) carry extra rules, documented per app: a model never sends or commits
autonomously without passing a deterministic policy gate and (by default) human
approval. Reports that demonstrate a way around those gates are high-priority.
