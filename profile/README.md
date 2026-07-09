<div align="center">

# walaware

**A family of small, self-hosted life apps — one warm world, many corners.**

Personally-built, open-source, self-hostable apps that each handle one corner of
life, sharing one design language (the **Campfire** house style) and one set of
conventions so the whole suite feels like a single product.

</div>

---

## The suite

| App | Corner of life | Status |
| --- | --- | --- |
| 🧭 **[tripwala](https://github.com/walaware/tripwala)** | Journeys & trips — one link where the group gathers | shipped |
| 🛍️ **[shopwala](https://github.com/walaware/shopwala)** | Buying & selling — a Marketplace agent + hub | in build |
| ❤️ **healthwala** | Health & meals | planned |
| 📦 **stuffwala** | Personal inventory | planned |
| 👛 ~~moneywala~~ | Money & expenses | **not building — we use [Sure](https://github.com/we-promise/sure)** |
| ✅ **taskwala** | Plans & tasks | planned |
| 👥 **folkwala** | People & relationships | planned |

Plus **[design](https://github.com/walaware/design)** — the shared `@walaware/design`
system (tokens, the `wala` wordmark, Svelte 5 components) — and this **`.github`**
repo, the home for org-wide conventions ([documentation standard](DOCUMENTATION.md),
[contributing](CONTRIBUTING.md), [AI policy](AI_POLICY.md), [security](SECURITY.md)).

## When we don't build

The point of walaware is to *manage* the corners of life, not to own every piece of
software that does it. Where great open-source already exists, the walaware move is
to **recommend it, use it, and contribute back** — not to reinvent it in Svelte so
the accent colour matches. Suite coherence is worth something; it isn't worth a
worse app.

So a corner of life can resolve one of two ways: we build it, or we point at the
people already doing amazing work.

| Corner | We use | Why not build |
| --- | --- | --- |
| 👛 Money & expenses | **[we-promise/sure](https://github.com/we-promise/sure)** (AGPL, self-hosted) | Envelope-grade budgeting, investments, net worth, ~18 bank/broker/crypto integrations, BYO-key market data, and free unlimited household members on self-hosted — with finer per-account permissions than the $100/yr commercial alternatives. Taking ~200 commits a month from 160+ contributors. |

When a tool we adopt falls short, we **write it down before we act on it.** Every
adopted tool carries a wishlist in [adopted-tools.md](docs/adopted-tools.md). Gaps get
lived with long enough to know whether they're real; most never are. If one earns
action, contributing upstream beats forking, and forking beats rewriting. We revisit
"build it ourselves" only when the gap is structural and the evidence is in hand.

**No placeholder repo.** A corner we don't build doesn't get an empty repo — it gets
a row in the table above and an entry in [adopted-tools.md](docs/adopted-tools.md).

## What they share

- **Stack:** SvelteKit 5 + Tailwind 4 + PocketBase + Caddy, one Docker Compose
  stack, pnpm, secrets via 1Password `op://`.
- **Look:** the **Campfire** design system with a per-app accent (`@walaware/design`).
- **Principles:** self-hostable; migrations are the source of truth; the browser
  never talks to PocketBase directly; AI is vendor-neutral, BYO-token, cheap-first,
  and always degrades to a deterministic fallback.
- **Built openly with AI** under human direction & review — see the [AI policy](AI_POLICY.md).

> A unified walaware.ai landing page is coming. Until then, this is home.
