# moneywala — charter

> Status: **chartered** (2026-09-08), not yet built. This doc lives here until
> `walaware/moneywala` exists, then moves into that repo's `docs/` with a pointer
> left behind.

## The decision, and its history

- **2026-07-09** — moneywala (charter: budgeting & expenses, "a better Actual")
  was **not built**; [Sure](https://sure.am) was adopted instead. See
  [adopted-tools.md](adopted-tools.md). That reasoning still stands.
- **2026-09-08** — moneywala is **revived with a different charter**. It is not a
  budgeting app and does not compete with Sure. It is the suite's **money
  surface**: the one place the household — and the other wala apps — go for
  anything money-shaped. It owns the domains Sure was never built for (cards,
  loyalty points, recurring travel benefits) and fronts Sure as the engine for
  the domains Sure already wins (transactions, budgeting, bank sync, net worth).

The load-bearing distinction: *Sure isn't failing at loyalty; loyalty was never
its sport.* No mature self-hosted alternative covers loyalty currencies, benefit
credits, and award-booking logic (AwardWallet et al. are commercial and
scraping-based), so this passes the ["when we don't build"](../profile/README.md)
gate in the build direction.

## Goal

One shared household login where both partners see every card, every loyalty
balance, every recurring benefit (what's unused, what's expiring), and can ask
"we're booking N nights at X through channel Y — what fires, what conflicts, and
what does it really cost?" Spending and budgets remain visible through Sure.

The motivating use case: a spontaneous 2-night hotel booking where the household
holds multiple cards whose credits require *different* booking channels and
*different* paying cards — one booking, one card, one credit. Picking wrong
silently burns real money. That evaluation is deterministic and automatable.

## What moneywala owns natively (Sure never will)

| Domain | Notes |
| --- | --- |
| Cards & holders | Household roster, annual fees, anniversaries |
| Benefit rules | Amounts, reset cadence, qualification gates (channel, min nights, paying card, prepaid, category). Seeded as data with `source_url` + `verified_on` per record — issuer terms move often; nothing is seeded unverified. |
| Benefit lifecycle | `available → reserved → consumed`. *Reserved* lets a trip earmark a credit so the advisor stops offering it and reminders stop firing. On-property credits settle on hotel folios, invisible to any card feed — modeled as **manual-confirm** from day one. |
| Loyalty balances | **Manual entry first.** No consumer API exists for issuer points balances, and portal scraping is fragile and ToS-hostile. Model program-level realities explicitly (e.g. grandfathered sub-balances, FIFO redemption order, transfer ratios with effective dates). |
| The advisor | Evaluate a booking → qualifying benefits + conflicts + fee exposure; portal-vs-award comparison including fee deltas. **Deterministic code** per the [AI policy](../AI_POLICY.md) — AI may explain, never decide. |

## What stays in Sure

Transactions, budgeting, bank sync (SimpleFIN — one bridge account covers both
partners' institutions), investments, net worth, family sharing. moneywala:

- **reads Sure's `api/v1`** (scoped read key) — statement-credit detection means
  matching the *credit posting* transaction (days–weeks after purchase), plus any
  spending views moneywala wants to surface;
- **deep-links into Sure's UI** for budgeting rather than rebuilding it.

**Absorption is evidence-gated.** A Sure capability moves into moneywala only
when its wishlist row in [adopted-tools.md](adopted-tools.md) flips to
`confirmed` through daily use — never off a code read, never for coherence alone.
Forking Sure stays permanently off the table (AGPL merge burden, wrong data
model for loyalty).

## Seams

```
        wife ─┐                          ┌─→ Sure UI (budgets, deep-linked)
              ├─→ moneywala web ─────────┤
        self ─┘        │                 └─→ Sure api/v1 (read key)
                       │
   tripwala ──────→ /api/x/v1  (API Access standard — the ONLY surface
   "one wala" ─────→    "        other apps/agents ever talk to)
```

- moneywala exposes `/api/x/v1/*` per the [API Access standard](api-access.md):
  benefit status, balances (with sub-balance splits), evaluate-booking,
  reserve/release/confirm, expiring-by-horizon.
- Whether Sure sits behind moneywala is an implementation detail moneywala is
  free to change; consumers never know.
- tripwala is the first consumer: hotel search calls evaluate-booking so results
  are benefit-aware. tripwala's own scope (one stop for all travel, incl. day
  trips + hotel search) is chartered in the tripwala repo, not here.

## Household model

Standard blueprint app: PocketBase auth, both partners as users of one instance,
everything visible to both (per-record privacy is a non-goal for v1). Sure keeps
its own family logins; moneywala holds one scoped read key to the family's data.

## Security / boundaries

- **No household data in any repo.** Migrations seed benefit *rules* (public,
  citable facts) only. Cards, holders, balances, reservations are instance data.
- moneywala never stores bank credentials; the SimpleFIN token lives in Sure only.
- Sure read key is scoped + read-only; revocation per the API Access standard.
- All blueprint invariants apply (browser never talks to PocketBase; migrations
  are the source of truth; tailnet-only `/api/x`).

## Build order

1. Scaffold from the blueprint (repo, compose, PB, SvelteKit, Campfire accent).
2. Schema migrations: cards, holders, programs, balances (+ sub-balances),
   benefit rules, lifecycle states.
3. Manual-entry UI + the benefit dashboard (unused / expiring / by holder).
4. Advisor: evaluate-booking, in-app first.
5. Sure integration: read key, statement-credit detection.
6. `/api/x/v1` surface from the [API Access kit](../templates/api-access/).
7. tripwala consumes it (benefit-aware hotel search).

## Open questions

- Loyalty balance automation — deferred until manual entry demonstrably hurts;
  revisit vendors/AwardWallet-API access then, not before.
- Sure sync staleness (accounts refresh only on UI load) — logged in
  [adopted-tools.md](adopted-tools.md); diagnose the homelab Sidekiq/cron config
  before assuming an upstream gap. Statement-credit detection depends on this.
- Partial reservations (earmark $100 of a $250 credit) — punt until a real case.
