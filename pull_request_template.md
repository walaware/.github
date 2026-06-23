## What & why

<!-- What does this change, and why? Link the issue / roadmap item it advances. -->

## Checklist

- [ ] `pnpm check` (types) clean and `pnpm build` succeeds
- [ ] Data changes ship a PocketBase migration (migrations are the source of truth)
- [ ] Writes go through the server, not browser→PocketBase directly
- [ ] No secrets committed (1Password `op://` for real values)
- [ ] Docs touched follow the [documentation standard](https://github.com/walaware/.github/blob/main/DOCUMENTATION.md)
- [ ] Preserves the app's stated core principle

## Test plan

- [ ]
