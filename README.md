# walaware/.github

Org-wide defaults and shared reference for the **walaware** suite. GitHub
automatically applies the community-health files here to **every walaware repo**
that doesn't ship its own.

## What's here

| Path | Role |
| --- | --- |
| `profile/README.md` | The org's public landing page (github.com/walaware). |
| `DOCUMENTATION.md` | The documentation standard every repo follows. |
| `CONTRIBUTING.md` | Default contributing guide (inherited). |
| `CODE_OF_CONDUCT.md` | Default code of conduct (inherited). |
| `AI_POLICY.md` | Suite-wide AI/LLM disclosure (inherited). |
| `SECURITY.md` | Default security/vuln-reporting policy (inherited). |
| `ISSUE_TEMPLATE/`, `pull_request_template.md` | Default issue/PR templates (inherited). |
| `docs/` | Durable suite-wide reference for humans & coding agents (architecture, conventions, agent guide). |
| `templates/` | Copyable skeletons for new repos (README, spec). |

## How inheritance works

A file in this repo (e.g. `CONTRIBUTING.md`) is used by any walaware repo that
lacks its own. A repo overrides simply by adding its own copy. The `docs/` and
`templates/` folders are **referenced**, not auto-applied — link to them from a
repo's `CLAUDE.md` / `AGENTS.md` or docs.

Licensed [MIT](./LICENSE).
