# Branching and Merging Strategy

This project follows a structured branching strategy to ensure code quality, stability, and team collaboration. We primarily follow a **Feature Branching** model with a **Develop/Main** separation.

## Branch Types

### 1. `main` (Production)
- **Purpose:** Reflects the production-ready state of the code.
- **Rules:** 
  - Never commit directly to `main`.
  - Only merges from `develop` via Pull Request after validation.
  - Every commit here should be tagged with a version number (e.g., `v1.0.0`).

### 2. `develop` (Integration)
- **Purpose:** The primary integration branch for features.
- **Rules:**
  - Standard development targets this branch.
  - Must always be in a buildable/testable state.

### 3. `feature/*` (New Features)
- **Naming:** `feature/description-of-task` (e.g., `feature/user-auth`)
- **Workflow:**
  - Branch off from: `develop`
  - Merge back into: `develop`
  - Use **Pull Requests** for merging.

### 4. `fix/*` or `bugfix/*` (Bug Fixes)
- **Naming:** `fix/issue-description`
- **Workflow:**
  - Branch off from: `develop`
  - Merge back into: `develop`

### 5. `hotfix/*` (Emergency Production Fixes)
- **Purpose:** Critical fixes that cannot wait for the next release cycle.
- **Workflow:**
  - Branch off from: `main`
  - Merge back into: `main` AND `develop`

## Merging Approach: Industry Standards

### 1. Pull Requests (PRs)
- All merges into `develop` and `main` MUST happen via PR.
- PRs should include:
  - A clear description of changes.
  - Linked issues/tickets.
  - Verification results (test output, screenshots).

### 2. Squashing Commits
- **Preference:** We prefer **Squash and Merge** for feature branches into `develop`.
- **Reason:** Keeps the `develop` history clean and makes reverts easier. Each feature becomes a single, logical commit.

### 3. Rebase vs. Merge
- **Local:** Use `git rebase develop` on your feature branch to keep it up to date with the latest changes without creating "noise" merge commits.
- **Remote:** Avoid rebasing shared branches (`main`, `develop`).

### 4. Code Reviews
- Minimum of 1 approval required before merging to `develop`.
- Automated CI checks (linting, tests) must pass.

## Git Commands Cheat Sheet

- **Start a feature:**
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feature/my-new-feature
  ```

- **Update feature with latest develop:**
  ```bash
  git checkout feature/my-new-feature
  git fetch origin
  git rebase origin/develop
  ```

- **Submit changes:**
  ```bash
  git add .
  git commit -m "feat: descriptive message"
  git push origin feature/my-new-feature
  ```
