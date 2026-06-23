# AI / LLM disclosure

**walaware is a heavily AI-developed family of codebases.** The large majority of
the code, documentation, migrations, and configuration across the suite was
written by **LLM coding agents** (various tools) working **under human direction,
with a human reviewing, testing, and steering** every step. It is built this way
intentionally — walaware is partly an experiment in how far agent-driven
development can go on real, shipped products.

We disclose this for transparency, in the spirit of projects that publish an
explicit stance on AI use. This policy applies org-wide; individual repos link to
it from their README.

## What this means

- **For users.** The apps are real and running, but treat them like any young
  open-source project: read the code, and review before relying on one for
  anything critical. Each app documents its own security model.
- **For contributors.** AI-assisted contributions are **welcome** — that's how the
  projects are built. Whatever tools you use, *you* are responsible for your PR:
  it should be understood, tested, and reviewed by a human (you) before
  submission. See [CONTRIBUTING.md](./CONTRIBUTING.md).
- **Quality bar.** Changes are expected to pass each repo's checks (types +
  build), follow existing patterns, and include a migration for any data change.
  AI speeds the work; it doesn't lower the bar.

## How AI is used here

- Feature implementation, refactors, docs, and PocketBase migrations — generated
  by the agent, then reviewed and verified (type-check, build, and live testing
  against a running instance) before shipping.
- Human owns: product decisions, design direction, security review, and the final
  call on what merges and deploys.

## A note specific to agent-operated apps

Some apps (e.g. **shopwala**) use LLMs at runtime, not just in development. Where
they do, the same discipline applies and is documented per app: the model makes
**bounded, validated** decisions only; **deterministic code owns the loop and
gates every consequential action**; nothing autonomous touches a user's real
accounts without an explicit, human-approved policy.

## Provenance

Commits are authored by the maintainer, who is accountable for the result
regardless of how it was produced. Spot something off? Open an issue — extra human
eyes are exactly what codebases like these benefit from.
