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
| 👛 **moneywala** | Money & expenses | planned |
| ✅ **taskwala** | Plans & tasks | planned |
| 👥 **folkwala** | People & relationships | planned |

Plus **[design](https://github.com/walaware/design)** — the shared `@walaware/design`
system (tokens, the `wala` wordmark, Svelte 5 components) — and this **`.github`**
repo, the home for org-wide conventions ([documentation standard](DOCUMENTATION.md),
[contributing](CONTRIBUTING.md), [AI policy](AI_POLICY.md), [security](SECURITY.md)).

## What they share

- **Stack:** SvelteKit 5 + Tailwind 4 + PocketBase + Caddy, one Docker Compose
  stack, pnpm, secrets via 1Password `op://`.
- **Look:** the **Campfire** design system with a per-app accent (`@walaware/design`).
- **Principles:** self-hostable; migrations are the source of truth; the browser
  never talks to PocketBase directly; AI is vendor-neutral, BYO-token, cheap-first,
  and always degrades to a deterministic fallback.
- **Built openly with AI** under human direction & review — see the [AI policy](AI_POLICY.md).

> A unified walaware.ai landing page is coming. Until then, this is home.
