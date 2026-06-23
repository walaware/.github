# Contributing to walaware

Thanks for wanting to help! walaware is a family of small, friendly codebases and
we'd love your contributions — bug fixes, features, docs, or just ideas. This is
the org-wide default; an individual app may add its own `CONTRIBUTING.md` with
extra, app-specific rules.

## Ground rules

- **Be kind.** See the [Code of Conduct](./CODE_OF_CONDUCT.md).
- **AI-assisted work is welcome.** walaware is itself heavily AI-developed (see the
  [AI policy](./AI_POLICY.md)). Use whatever tools you like — but *you* own your
  PR: understand it, test it, and review it before submitting.
- **Respect each app's core principle.** Every app has one (tripwala: *one link,
  no mandatory logins*; shopwala: *a model never autonomously sends on your real
  account*). It's stated in the app's README — don't break it.
- **Mobile-first.** Most people open these on a phone. Design for that, let it
  scale up.
- **Small, focused PRs.** One concern per PR. A clear title and a short "why".

## Getting set up

You need [Node 22+](https://nodejs.org), [pnpm](https://pnpm.io), and the
[PocketBase](https://pocketbase.io) binary (or just Docker). Each repo's README
has the exact commands; the common shape:

```bash
cp .env.example .env
docker compose up --build        # whole stack
# or per-service: cd web && pnpm install && pnpm dev
```

## Before you open a PR

```bash
pnpm check    # types — must be clean
pnpm build    # must succeed
```

- Match the surrounding code style (Prettier-formatted, JSDoc types in `.js` /
  TS in `.ts`, Svelte 5 runes).
- **Touching data? Add a PocketBase migration** in `pocketbase/pb_migrations/`
  rather than editing the DB by hand — migrations are the source of truth.
- **Touching writes? They go through the server**, never browser→PocketBase
  directly. See the **Security model** in the app's README.
- Follow the [documentation standard](./DOCUMENTATION.md) for any docs you touch.

## Reporting bugs / requesting features

Open an issue using the templates. For bugs, include steps to reproduce and what
you expected. For features, tell us the *use case* — these apps grow from real use.
