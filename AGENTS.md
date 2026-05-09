<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git Workflow

This repo uses a **two-branch workflow**:

| Branch | Purpose |
|--------|---------|
| `main` | Production only. Stable, deployable code. |
| `dev` | Integration branch. All feature work merges here first. |

**Rules:**
- Always branch from `dev`. Never branch from `main`.
- Always PR to `dev`. Never open a PR directly to `main`.
- Use branch prefixes: `feature/`, `fix/`, `chore/`, `hotfix/`
- No direct pushes to `main` or `dev`. All changes go through pull requests.

**Hotfixes:** If production needs an urgent fix, branch from `main`, fix, PR to `main`, then backport the fix to `dev`.
