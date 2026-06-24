# walaware documentation standard

How every walaware repo documents itself, so the suite reads as one product. The
reference implementation is [tripwala](https://github.com/walaware/tripwala) (the
most mature app) and [design](https://github.com/walaware/design). New repos
follow this; existing repos converge on it.

> **Inheritance:** community-health files in this `.github` repo
> (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `AI_POLICY.md`,
> issue/PR templates, this standard) **auto-apply to every walaware repo** that
> doesn't ship its own. A repo only adds its own copy when it needs to override.

---

## 1. The doc set per repo

| File | Required | Notes |
| --- | --- | --- |
| `README.md` | ✅ apps & libs | The front door — fixed structure (§2). |
| `ROADMAP.md` | apps | Living, human-owned; links issues/milestones/discussions. |
| `docs/*.md` | as needed | Design docs / specs (§3). |
| `LICENSE` | ✅ | Per the license policy (§5). |
| `CONTRIBUTING.md` | inherited | Add a local copy only to override the org default. |
| `CODE_OF_CONDUCT.md` | inherited | Org default; don't duplicate. |
| `AI_POLICY.md` | inherited | Org default; link it from the README. |
| `SECURITY.md` | inherited | Org default. |
| `.github/workflows/`, `ISSUE_TEMPLATE/`, `pull_request_template.md` | as needed | Per-repo CI; templates inherited unless overridden. |
| `SESSION-SUMMARY-YYYY-MM-DD.log` | optional | **Gitignored** personal resume notes (§4). |

## 2. README structure (canonical order)

1. **Centered header** — `<div align="center">` … `</div>` with:
   `# <emoji> <name>` (the app's `WALA_SUITE` glyph emoji + lowercase name) ·
   **bold one-line tagline** · one short paragraph (what + who for) ·
   **badge row** · then `---`.
2. **Why <app>?** — the hook; the single killer feature in **bold**.
3. **Features** — emoji bullets, each a **bold lead-in** + plain explanation.
4. **Quick start (Docker)** — `git clone` → `cp .env.example .env` → `docker compose up --build` → the demo URL.
5. **Tech stack** — 2-column table (Layer | Choice) with links.
6. **Local development** — Node 22+ / pnpm / PocketBase binary; `pnpm check` + `pnpm build` before a PR.
7. **Deploying (homelab / GHCR)** — `op run -- docker compose -f compose.prod.yml …`; reverse-proxy / Cloudflare Tunnel note; "back up `pb_data`".
8. **How it works** — data model (collections) + a **Security model** subsection.
9. **Roadmap** — short teaser + link to `ROADMAP.md`.
10. **Built with AI** — two lines + link to `AI_POLICY.md`.
11. **Contributing** — link `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md`; restate the repo's core principle.
12. **License** — name + one-line plain-English summary.

**Badge row** (shields.io), in order: License · framework (`SvelteKit-5`) ·
`PocketBase-0.39` · `PRs-welcome` · `built_with-AI_%2B_human_review` (→ `AI_POLICY.md`).
Libraries swap stack badges for what fits (e.g. `Svelte-5`, `Tailwind-4`).

## 3. `docs/` design-doc / spec style

- Open with a **status blockquote**: `> Status: **design** (not yet built)` ·
  `drafted` · `built`.
- Shape: **Goal** → **ASCII architecture diagram** (fenced) → **tables** for
  surfaces / contexts / fields / states → **Build order** (numbered) →
  **Security / boundaries**.
- **Naming:** numbered prefixes for a *sequenced spec set reviewed as a unit*
  (e.g. `01-data-model.md` … `06-mcp-api-seam.md`); topic names for *evergreen
  standalone* docs (e.g. `api-layer.md`, `ai-features.md`). Add a `docs/README.md`
  index once there are ≥3 docs.

## 4. Session summaries

Dated `SESSION-SUMMARY-YYYY-MM-DD.log`, **gitignored** (`*.log`). Personal resume
notes between sessions. Convention: a top blockquote (gitignored note + pointer to
the prior log), `## Headline`, `## Commits` (hashes + one-liners), and what's next.

## 5. License policy

- **Apps** (tripwala, shopwala, healthwala, …) → **AGPL-3.0** — network copyleft
  suits self-hostable products.
- **Shared libraries** (`design`, future `*-core` packages) → **MIT** — permissive
  so apps consume freely.
- **Landing page / this `.github` repo** → **MIT**.

## 6. Voice & cross-cutting conventions

- **Voice:** warm, second-person, concrete, opinionated. Em-dashes. "in one
  breath" / "in one paragraph" summaries. No corporate fluff, no hype.
- **Naming:** repos `walaware/<app>`; packages `@walaware/<app>-<part>`
  (`-web`, `-core`, `-worker`, `-mcp`); GHCR images `<app>-<service>`.
- **Invariants, phrased consistently everywhere:** migrations are the source of
  truth · secrets via 1Password `op://` · browser never talks to PocketBase
  directly · one Docker Compose stack · design via `@walaware/design` +
  `data-app="<app>"` · AI is vendor-neutral / BYO-token / cheap-first and degrades
  to a deterministic fallback.

## 7. Starting a new repo

Copy the skeletons in [`templates/`](templates/) (`README.template.md`,
`spec.template.md`), pick the LICENSE per §5, and let the rest inherit from this
repo. Wire `@walaware/design` (`github:walaware/design#<tag>` + `data-app`).
