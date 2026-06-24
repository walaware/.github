<div align="center">

# <emoji> <app>

**<one-line tagline>**

<One short paragraph: what it is and who it's for.>

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![Built with SvelteKit](https://img.shields.io/badge/SvelteKit-5-ff3e00.svg)](https://kit.svelte.dev)
[![PocketBase](https://img.shields.io/badge/PocketBase-0.39-b8dbe4.svg)](https://pocketbase.io)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/walaware/.github/blob/main/CONTRIBUTING.md)
[![AI-developed](https://img.shields.io/badge/built_with-AI_%2B_human_review-7c3aed.svg)](https://github.com/walaware/.github/blob/main/AI_POLICY.md)

</div>

---

## Why <app>?

<The hook — the problem it solves. The single killer feature in **bold**.>

## Features

- <emoji> **<bold lead-in>** — <plain explanation>
- <emoji> **<bold lead-in>** — <plain explanation>

## Quick start (Docker)

```bash
git clone https://github.com/walaware/<app>.git
cd <app>
cp .env.example .env
docker compose up --build
```

Open **http://localhost:8080** (PocketBase admin at `/_/`).

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Backend | [PocketBase](https://pocketbase.io) |
| Frontend | [SvelteKit](https://kit.svelte.dev) 5 (adapter-node) |
| Styling | Tailwind CSS v4 + [@walaware/design](https://github.com/walaware/design) |
| Proxy | Caddy (single origin) |
| Deploy | Docker Compose · GHCR images |

## Local development

Node 22+, pnpm, and the PocketBase binary. Before a PR: `pnpm check` && `pnpm build`.
See [CONTRIBUTING](https://github.com/walaware/.github/blob/main/CONTRIBUTING.md).

## Deploying (homelab / GHCR)

```bash
op run -- docker compose -f compose.prod.yml pull
op run -- docker compose -f compose.prod.yml up -d
```

Front the published Caddy port with a reverse proxy / Cloudflare Tunnel. Back up
the `pb_data` volume.

## How it works

<Data model (collections) + how the pieces fit.>

### Security model

<Browser never talks to PocketBase directly; server-mediated, scoped access.>

## Roadmap

<Teaser> — see [ROADMAP.md](./ROADMAP.md).

## Built with AI

<app> is a heavily AI-developed codebase, written by LLM agents under human
direction and review. See the [AI policy](https://github.com/walaware/.github/blob/main/AI_POLICY.md).

## Contributing

PRs welcome — see [CONTRIBUTING](https://github.com/walaware/.github/blob/main/CONTRIBUTING.md)
and the [Code of Conduct](https://github.com/walaware/.github/blob/main/CODE_OF_CONDUCT.md).
<Restate the app's core principle.>

## License

[AGPL-3.0](./LICENSE) — free to self-host and modify; run a modified version as a
network service and you share your changes.
