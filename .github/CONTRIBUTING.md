# Contributing

## Git Workflow

This project uses a **two-branch workflow**:

| Branch | Purpose |
|--------|---------|
| `main` | Production only. Stable, deployable code. |
| `dev` | Integration branch. All feature work merges here first. |

## Rules

1. **Always branch from `dev`.** Never branch from `main`.
2. **Always PR to `dev`.** Never open a PR directly to `main`.
3. **Name branches descriptively.** Use prefixes:
   - `feature/` - new features
   - `fix/` - bug fixes
   - `chore/` - maintenance, config, deps
   - `hotfix/` - urgent production fixes (see below)
4. **No direct pushes** to `main` or `dev`. All changes go through pull requests.

## Pull Request Process

1. Create your feature branch from `dev`:
   ```bash
   git checkout dev
   git pull
   git checkout -b feature/your-feature-name
   ```

2. When ready, open a PR **to `dev`**.

3. Fill out the PR template. Include:
   - What changed and why
   - How to test the change
   - Screenshots if UI-related

4. Once reviewed and approved, the PR is merged into `dev`.

5. Production releases (`dev` -> `main`) are handled by the project maintainer.

## Hotfixes

If production (`main`) needs an urgent fix:

1. Branch from `main`: `git checkout -b hotfix/fix-name main`
2. Fix the issue
3. PR to `main` (exception to the normal rule)
4. After merging to `main`, also merge the fix into `dev` to keep branches in sync

## Code Style

- Follow existing conventions in the codebase
- Run linting/formatting before committing
- Keep commits focused and descriptive
