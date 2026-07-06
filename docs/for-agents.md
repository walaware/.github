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

If clideck isn't available (any non-dev-server session), don't build the shared
surface locally — leave it and flag it as a request to forward to the design agent.

### Reaching the design agent over clideck

The request in step 3 goes to the design agent over **clideck**. Reuse a session
before spawning one, and clean up after:

1. **Look for an existing design session first.** `clideck agents --all` lists the
   *active* cross-project sessions with their `@project/session` ask addresses (the
   design one is under `@design/…`). Dormant sessions are **not** in that list — check
   the clideck app for a **stale/resumable** design session.
2. **Resume the stale one** rather than spawning a duplicate; then confirm it now
   shows under `clideck agents --all`. A just-resumed session may first replay stale
   context from its previous task — re-ask cleanly and ignore that first capture.
3. **Otherwise create a new session** in the `design` project through clideck.
4. **Ask it:** `clideck ask --session "@design/<name>" --timeout 8m --message "…"`.
   `--timeout` takes a **duration string** (`8m`, `30s`, `1h`) — a bare number parses
   as `0s` and the call returns instantly. The target is another agent that may need
   minutes; set both `--timeout` and your own shell timeout high. A timeout means
   "still working," not "failed" — poll `clideck agents` for `working:false`, then
   re-ask for the outcome instead of re-injecting mid-task.
5. **Clean up when done.** If you *created* the session for this request, remove it
   once the work lands; if you *resumed* a pre-existing one, return it to dormant.
   Don't leave orphaned sessions running.

## House style

Match surrounding code. Many small files over few large ones. Immutable updates.
Warm, concrete, no-hype writing. Small focused PRs with a clear "why".
