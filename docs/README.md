# walaware shared reference (`/docs`)

Durable, suite-wide reference for **humans and coding agents** working in any
walaware repo. Repo-specific design docs live in that repo's own `docs/`; this
folder holds the things that are true across *all* of them.

A repo's own `CLAUDE.md` / `AGENTS.md` should point here rather than restating it,
so there's one source of truth and per-repo agent context stays short.

| Doc | What it covers |
| --- | --- |
| [architecture.md](architecture.md) | The canonical walaware app blueprint — stack, layout, how the pieces fit, the load-bearing invariants. |
| [conventions.md](conventions.md) | Build/code/migration/security/design conventions every repo follows. |
| [for-agents.md](for-agents.md) | Rules of the road for coding agents: where standards live, what not to break, how to start a new app. |
| [api-access.md](api-access.md) | The org-wide **API Access** standard — scoped, revocable API tokens for programmatic backend access (never superuser). Reference kit in [`../templates/api-access/`](../templates/api-access/). |

See also (repo root): [DOCUMENTATION.md](../DOCUMENTATION.md) (doc standard),
[CONTRIBUTING.md](../CONTRIBUTING.md), [AI_POLICY.md](../AI_POLICY.md),
[SECURITY.md](../SECURITY.md).
