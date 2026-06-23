# For coding agents working in walaware

If you're an LLM coding agent (or a human onboarding fast), start here.

## Orientation (read these first)

1. [architecture.md](architecture.md) — the app blueprint (stack, layout, how it fits).
2. [conventions.md](conventions.md) — the rules (PocketBase, web, worker, AI, secrets).
3. [../DOCUMENTATION.md](../DOCUMENTATION.md) — how to write docs/READMEs.
4. The target repo's own `README.md` + `docs/` — the app-specific design.

A repo's root `CLAUDE.md` / `AGENTS.md` should be short and **link here** instead
of restating shared rules.

## Rules of the road (don't break these)

- **Migrations are the source of truth.** Any schema/data change → a numbered
  PocketBase migration. Never hand-edit the DB.
- **Server-mediated access.** Browser never talks to PocketBase directly; reads in
  `load()`, writes in server actions, all scoped. Don't add client→PB calls.
- **Secrets via `op://`.** Never hardcode or commit a credential; add to
  `.env.example` instead.
- **Respect each app's core principle** (stated in its README) — e.g. shopwala: a
  model never autonomously sends on a real account without the policy gate +
  human approval.
- **AI output is always Zod-validated** and degrades to a deterministic fallback.
- **Verify before claiming done:** `pnpm check` + `pnpm build` (web); typecheck
  the worker. Report failures honestly.

## Reuse over reinvention

- Tokens & generic components → **`@walaware/design`**; don't re-roll buttons,
  cards, the wordmark, the palette. Check its `dist/` for exact component props.
- New app? Copy the skeletons in [../templates/](../templates/), mirror the most
  mature sibling ([tripwala](https://github.com/walaware/tripwala)) for structure,
  pick the LICENSE per policy, and let community-health files inherit from this repo.

## House style

Match surrounding code. Many small files over few large ones. Immutable updates.
Warm, concrete, no-hype writing. Small focused PRs with a clear "why".
