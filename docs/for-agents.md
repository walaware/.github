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

- **Before building a new app at all, check whether great open-source already
  exists.** walaware manages the corners of life; it does not need to own every
  piece of software that does. Where a mature, healthy, self-hostable project
  already covers a corner, the walaware move is to **recommend it and use it** —
  see [adopted-tools.md](adopted-tools.md). Judge health on evidence (commit cadence,
  contributor count, bus factor, release discipline), not stars. Suite design
  coherence is a real benefit, but it is never worth shipping a worse app. Money &
  expenses resolved this way: we use [Sure](https://sure.am)
  ([docs](https://docs.sure.am)) instead of building `moneywala`, and there is
  **no `moneywala` repo**.
- **When an adopted tool falls short, log it before acting on it.** Gaps go in the
  wishlist in [adopted-tools.md](adopted-tools.md). Gaps found by reading source
  usually aren't felt in daily use — write them down, live with them, and let the
  ones that are real prove it. **Don't propose patches, forks, or rewrites off a
  code read.** If an item does earn action, the order is contribute upstream, then
  fork, then rewrite: a fork is free to start later and expensive to maintain early,
  and "the architecture underneath is more elegant" is not a user-visible feature.
- Tokens & generic components → **`@walaware/design`**; don't re-roll buttons,
  cards, the wordmark, the palette. Check its `dist/` for exact component props.
- New app? Copy the skeletons in [../templates/](../templates/), mirror the most
  mature sibling ([tripwala](https://github.com/walaware/tripwala)) for structure,
  pick the LICENSE per policy, and let community-health files inherit from this repo.

## Need a new visual surface? Route it through design

Whenever an app needs a **new visual surface** — a component, a page, or any
visual design — the design system leads; **don't start fresh in the app**. In
order:

1. **Check first.** Look for existing guidance and primitives in
   **`@walaware/design`** and the [design repo](https://github.com/walaware/design)
   before making anything new. If it's already covered, use it.
2. **Prefer shared over local.** If new code is genuinely needed, decide whether
   it should be a **shareable component** rather than app-local — especially
   anything that isn't app-specific. Generic → shared; domain → local.
3. **Request it from design.** When it should be shared, request a new package from
   the **design agent** (the [design repo](https://github.com/walaware/design) owns
   shared surfaces) rather than re-rolling it in the app.
4. **Design agent owns the design.** It consults **Claude Design** for the design
   guidance, syncs the result to the **design repo**, then releases a **design
   package plus the app-specific guidance** from there.
5. **Then build.** Only once that's released does the app agent continue with the
   frontend work — against the shipped package and guidance, not a local guess.

## House style

Match surrounding code. Many small files over few large ones. Immutable updates.
Warm, concrete, no-hype writing. Small focused PRs with a clear "why".
