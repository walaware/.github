# Adopted tools — corners of life we don't build

> Living document. Paired with [for-agents.md → Reuse over reinvention](for-agents.md).

walaware manages the corners of life. It does not need to own every piece of
software that does. Where a mature, healthy, self-hostable project already covers a
corner, the walaware move is to **recommend it and use it** — not to reinvent it in
Svelte so the accent colour matches.

Suite design coherence is a real benefit. It is never worth shipping a worse app.

So a corner resolves one of two ways: **we build it**, or **we point at the people
already doing amazing work.** This file is the record of the second kind, and of the
gaps we're carrying as a result.

## How we handle gaps

**Log them. Don't act on them.**

Gaps found by reading someone's source almost never turn out to be the ones you feel
in daily use. So we write them down, live with them, and let the real ones prove
themselves. Most entries should sit at `unverified` for a long time — that's this
file working correctly, not rotting.

No wishlist entry is committed work, and none of it is a promise to send patches to
anyone. If an item ever earns action, the order is **contribute upstream → fork →
rewrite**: a fork is free to start later and expensive to maintain early, a separate
frontend permanently opts you out of the project's UI work, and "the architecture
underneath is more elegant" is not a user-visible feature.

**Don't propose patches, forks, or rewrites off a code read.**

| Status | Means |
| --- | --- |
| `unverified` | Found by reading source. Not yet felt in daily use. |
| `confirmed` | Actually bites, in practice, repeatedly. |
| `not an issue` | Lived with it; turns out we don't care. |
| `worked around` | Solved outside the tool (script, export, spreadsheet). |
| `acted on` | Something was done. Note what. |

---

## 👛 Money & expenses → [Sure](https://sure.am)

**Site** [sure.am](https://sure.am) · **Docs** [docs.sure.am](https://docs.sure.am) ·
**Source** [`we-promise/sure`](https://github.com/we-promise/sure)

AGPL-3.0 · Rails 8.1 + Postgres + Redis + Sidekiq · self-hosted via docker-compose
(or [Helm](https://docs.sure.am/self-hosting-helm)). Community fork of the archived
`maybe-finance/maybe`, unaffiliated with Maybe Finance Inc.

**Decided 2026-07-09. `moneywala` will not be built.**

### Docs worth bookmarking

[`docs.sure.am/llms.txt`](https://docs.sure.am/llms.txt) is a machine-readable index
of every page — **start any agent there.**

| Page | For |
| --- | --- |
| [Self-hosting (Docker)](https://docs.sure.am/self-hosting) | The deploy. Compose file, env vars, backup profile, upgrade path. |
| [Quickstart](https://docs.sure.am/quickstart) | First run. |
| [Providers overview](https://docs.sure.am/providers/overview) | Choosing banking / crypto / market-data providers. |
| [SimpleFIN](https://docs.sure.am/providers/simplefin) | Our bank-sync choice — user brings their own token. |
| [Market data](https://docs.sure.am/providers/market-data) | `yahoo_finance` works with no API key. |
| [CSV imports](https://docs.sure.am/guides/app-features/csv-imports) | Migrating off Actual Budget. |
| [Family sharing](https://docs.sure.am/guides/app-features/family-sharing) | Adding a partner. |
| [Investment accounts](https://docs.sure.am/guides/key-concepts/investment-accounts) | Holdings, trades, cost basis. |
| [API reference](https://docs.sure.am/openapi.yaml) | OpenAPI spec. |

### Deployment gotchas

- **`ghcr.io/we-promise/sure:latest` is the ALPHA channel.** Use **`:stable`** for
  anything real. This is an unusual convention and easy to pattern-match straight
  past — pin the resolved digest.
- **Required env is just `SECRET_KEY_BASE` + `POSTGRES_PASSWORD`.** Sure encrypts
  some columns (e.g. `invitations.email`/`token`) and the docs list no separate
  ActiveRecord encryption keys, so those are almost certainly derived from
  `SECRET_KEY_BASE`. **Treat it as the master key** — store it before first boot;
  losing it once data exists may make encrypted columns unrecoverable.
- Use the **official backup service** shipped in the compose file
  (`prodrigestivill/postgres-backup-local`, behind `--profile backup`, writing to
  `/opt/sure-data/backups`) rather than hand-rolling a `pg_dump` cron. Test the
  restore. This is financial data.
- The **first user of an instance auto-becomes `super_admin`.**
- On self-hosted, invitations **send no email** unless SMTP is configured — the UI
  surfaces a copy-paste accept link instead. Expected, not a bug.

### Why not build

Sure ships everything `moneywala` planned, and more:

- Budgeting, rules engine, recurring transactions, CSV + provider imports.
- Investments & net worth — securities, price history, multi-currency + FX, crypto.
- **~18 bank/broker/crypto integrations** — Plaid (US+EU), SimpleFIN, Akahu, Up,
  Enable Banking, Mercury, Brex, Sophtron, Lunchflow, SnapTrade, Questrade, IBKR
  Flex, Indexa, Binance, Coinbase, Kraken, Coinstats.
- **Nine-provider BYO-key market data** — `twelve_data, yahoo_finance, tiingo, eodhd,
  alpha_vantage, mfapi, binance_public, moex_public, tinkoff_invest`. **Yahoo works
  with no API key**, so a self-hoster gets prices with zero paid signup. (Maybe's own
  `Synth` price service died with the company; Sure already replaced it.)
- **Household collaboration, free and unlimited on self-hosted** — separate logins
  with own 2FA/WebAuthn, four global roles, and per-account `owner` / `full_control` /
  `read_write` / `read_only` permissions enforced through Pundit. Private accounts via
  `accounts.owner_id` + `families.default_account_sharing`. No seat gate anywhere
  (`family/subscribeable.rb`: `upgrade_required?` returns `false` if `self_hoster?`).
  **Finer-grained than the $100/yr commercial alternatives.**
- Multi-tenant families, SSO/OIDC/WebAuthn, AI assistant, goals, mobile app.
- A real API — 33 `api/v1` controllers, an 87-operation OpenAPI spec, OAuth2 +
  API keys + JWT, with domain logic in fat models (82k LOC in `app/models/`).

**Health** (HEAD `8d649bc`, 2026-07-08): 8.9k★ · 1,612 commits in 365d, 206 in 30d ·
166 unique contributors in 6 months · top contributor 20%, top three <40% · 18 semver
releases, latest `v0.7.2`. Volunteer-run, no company, no CLA.

Building `moneywala` would mean re-deriving all of that so one app's accent matched
its siblings. **We didn't want moneywala. We wanted a better Actual. Sure is that.**

### What was also evaluated

**[Actual Budget](https://github.com/actualbudget/actual)** (MIT) — rejected, and the
rejection stands. It is **local-first with no server database**: `sync-server` stores
only a log of CRDT cell-messages (`messages_binary`) and opaque budget blobs, while
the SQLite database lives in the *browser* (WASM + absurd-sql + IndexedDB) with the
`loot-core` engine in a web worker. The server cannot answer "list transactions for
account X." Consequences: **zero investments model** anywhere in its schema, and every
new column must be a CRDT-replicated cell rather than an ordinary row;
`@actual-app/api` is the whole engine headless, **one budget file per Node process**;
2,647 forks and zero notable hard forks changing the data layer. A separate frontend
on Actual is architecturally impossible without embedding its engine.

> **Process note worth keeping.** Sure was *first rejected* on the claim "Rails/Hotwire
> can't consume `@walaware/design`, so it breaks suite coherence." That claim was
> wrong, and it was load-bearing — Sure ships a broad REST API, so a SvelteKit SPA
> could always have fronted it. One unverified fact was carrying the entire
> recommendation. Check the load-bearing claim before you plan around it.

### Wishlist — what Sure doesn't do

Tracked against HEAD `8d649bc` / `v0.7.2`.

| Gap | Why it matters | Severity | Status | Notes |
| --- | --- | --- | --- | --- |
| **No envelope carryover.** `Budget` is one row per family per month, `find_or_bootstrap`s fresh. No rollover, no persistent "to be budgeted". | Envelope budgeting with carryover is why we used Actual. Sure's model is monthly targets (Monarch-style). | High — if real | `unverified` | **Most likely to bite.** Watch for it around month 2, when a category needs to underspend now and overspend later. |
| **No tax lots.** `holdings` carries one average `cost_basis`; `Trade#realized_gain_loss` uses `avg_cost`. FIFO / specific-ID impossible. | Wrong cost basis selling appreciated positions under US tax rules. Irrelevant for buy-and-hold in tax-advantaged accounts. | High **if** we sell taxable positions | `unverified` | Depends on what we actually hold. Check before the first taxable sale, not before. |
| **No TWR / IRR / XIRR.** Simple gain-loss and period trends only. | Can't honestly benchmark portfolio performance. | Medium | `unverified` | Brokerage statements already report this. |
| **No stock splits / corporate actions.** | Splits absorbed only by re-syncing provider holdings; manual accounts drift. | Low–medium | `unverified` | |
| **No options modeling.** `securities.kind` is `standard\|cash`. | No strike/expiry/contract. | Low | `unverified` | |
| **Single-entry ledger.** `entries` has one `amount`, no legs; a buy is one `Trade` record. | Structural root of the four rows above — lots, corporate actions, and multi-currency correctness fall out naturally from double-entry postings, and are bolt-ons here. | Architectural | `unverified` | The only genuine argument `moneywala` ever had. Judged insufficient. Not fixable in place. |
| **Member management is web-only.** No `invitations` endpoint under `api/v1`. | Setup friction once, then never again. | Low | `unverified` | |
| **No per-transaction attribution or comments.** No `modified_by`; single `notes` per entry. | Only matters with two active users disagreeing about categories. | Low | `unverified` | |
| **Self-hosted invites send no email.** `deliver_later unless self_hosted?`; UI surfaces a copy-paste accept link. | Trivial, once. | Low | `not an issue` | Copy the link. |

### Next step

Self-host Sure ([Docker guide](https://docs.sure.am/self-hosting)). Import Actual data
([CSV imports](https://docs.sure.am/guides/app-features/csv-imports)). **Use it as a
daily budget for a month**, then log what actually bit. The decision after that is
empirical, not architectural.

Revisit `moneywala` only if the double-entry gap becomes concrete after real use —
options, corporate actions, multi-currency lots. Then you'd know exactly what you're
building and why, instead of guessing from a spec.

### License note, if a fork is ever contemplated

Sure is AGPL-3.0, no CLA. Keep AGPLv3, state a fork is based on Maybe Finance but not
affiliated or endorsed, don't use the "Maybe" name or logo. Under §13, modifications
run as a network service must offer their complete corresponding source to network
users. A standalone frontend in its own repo/process talking to Sure only over HTTP is
the canonical separate-work case and can carry its own license — the copyleft lands on
the modified server, not the client. (Not legal advice; collapses if the frontend is
bundled into the Rails process.) `ghostfolio` is also AGPL: read for design, copy no
code into a tree you want relicensable.

---

## Vendor context (money, and reusable elsewhere)

- **Bank sync → SimpleFIN** (~$15/yr, US+CA). The virtue isn't the price: the *user
  pastes their own token*, so nothing redistributes credentials. Teller (US-only, 100
  free connections) is the other indie-accessible option. Plaid / MX / Finicity / Akoya
  / Yodlee are approval- or sales-gated. GoCardless is EU/UK and closed to new signups.
- **Market data — BYO key, always.** yfinance and Polygon are **personal-use-only under
  their terms**; an open-source app cannot ship them as a default for other people's
  data. EODHD's commercial tier carries redistribution rights. BYO-key sidesteps the
  question entirely and shifts vendor cost to the self-hoster. Same instinct as the
  suite's vendor-neutral, BYO-token AI policy.
- **US bank-data risk.** CFPB §1033 was finalized Oct 2024 → sued → reversed →
  preliminarily enjoined Oct 2025, being reproposed with provider fees on the table.
  Chase began charging aggregators July 2025 (reportedly ~$300M/yr to Plaid alone).
  Costs are trending up and uncertain. Re-verify any vendor's pricing and terms before
  committing — they move.
