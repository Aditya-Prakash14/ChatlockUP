# GitHub Actions CI/CD Setup

This document describes the automated CI/CD pipeline for ChatlockUP using GitHub Actions.

## Workflows Overview

### 1. **CI Workflow** (`ci.yml`)
Runs on every push to `main` or `develop` branches and on all pull requests.

**Jobs:**
- **Server (Node.js)**
  - Tests Node.js versions: 18.x, 20.x, 22.x
  - Spins up PostgreSQL 16 test database
  - Installs dependencies
  - Generates Prisma Client
  - Runs database migrations
  - Lints code
  - Runs tests
  
- **Client (React)**
  - Tests Node.js versions: 18.x, 20.x, 22.x
  - Installs dependencies
  - Lints code
  - Runs tests with coverage
  - Builds production bundle

- **Security Audit**
  - Audits npm dependencies for vulnerabilities
  - Flags moderate and high severity issues

### 2. **Deploy Workflow** (`deploy.yml`)
Triggers on successful push to `main` branch.

**Jobs:**
- **Deploy Server to Render**
  - Requires: `RENDER_API_KEY`, `RENDER_SERVICE_ID` secrets
  - Deploys backend via Render API
  
- **Deploy Client to Vercel**
  - Requires: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets
  - Builds React app
  - Deploys to Vercel

### 3. **Code Quality Workflow** (`code-quality.yml`)
Runs linting and code formatting checks.

**Jobs:**
- **ESLint** — Lints both server and client code
- **Format Check** — Checks Prettier formatting
- **Dependency Check** — Audits dependencies

### 4. **PR Checks Workflow** (`pr-checks.yml`)
Validates pull requests before merge.

**Jobs:**
- **PR Validation**
  - Validates commit messages and PR title format
  - Checks branch naming conventions
  - Flags large changes
  - Posts PR checklist comment
  
- **Changed Files** — Reports which files were modified

---

## Required Secrets

Configure these in **GitHub Repository Settings → Secrets and Variables → Actions**:

### Deployment Secrets
```
RENDER_API_KEY           # Render.com API key
RENDER_SERVICE_ID        # Render service ID for backend
VERCEL_TOKEN             # Vercel authentication token
VERCEL_ORG_ID            # Vercel organization ID
VERCEL_PROJECT_ID        # Vercel project ID
REACT_APP_API_URL        # Backend API URL for React env
```

### Optional
```
SLACK_WEBHOOK_URL        # For notifications (future)
CODECOV_TOKEN            # For coverage reports (future)
```

---

## Environment Variables

### Server CI
- `DATABASE_URL` — PostgreSQL test database (auto-configured)
- `JWT_SECRET` — Set to `test_secret_key_for_ci`
- `NODE_ENV` — Set to `test`

### Client CI
- `REACT_APP_API_URL` — Set to backend URL during build
- `CI` — Set to `true`

---

## Branch Protection Rules

Recommended rules for `main` branch:

1. **Require status checks to pass:**
   - Server CI
   - Client CI
   - Security Audit
   - Code Quality
   - PR Checks

2. **Require code reviews:**
   - Minimum 1 approval
   - Dismiss stale reviews when new commits

3. **Require branches to be up to date before merging**

4. **Restrict who can push:**
   - Allow admins to bypass

Configure at: **Settings → Branches → Branch protection rules**

---

## Commit Message Convention

Follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Code style (no logic change)
- `refactor` — Code refactoring
- `perf` — Performance improvement
- `test` — Test changes
- `chore` — Build/tooling
- `ci` — CI/CD changes

**Examples:**
```
feat(auth): add JWT token refresh endpoint
fix(websocket): handle disconnect gracefully
docs(api): update endpoint documentation
chore(deps): upgrade dependencies
```

---

## Branch Naming Convention

Use the following pattern:

```
<type>/<description>
```

**Types:**
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation
- `refactor/` — Code refactoring
- `hotfix/` — Production hotfixes
- `dev/` — Development/experimental

**Examples:**
```
feature/user-authentication
fix/websocket-message-delivery
docs/api-endpoints
refactor/crypto-module
hotfix/security-vulnerability
```

---

## Running Workflows Manually

You can manually trigger workflows from GitHub UI:

1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Choose branch and click **Run**

Or use GitHub CLI:

```bash
gh workflow run ci.yml --ref main
gh workflow run deploy.yml --ref main
```

---

## Local Testing (Pre-commit)

To test locally before pushing:

### Server
```bash
cd server
npm install
npm run db:migrate      # Setup test DB
npm test                # Run tests
npm run lint            # Lint code
```

### Client
```bash
cd client
npm install
npm test -- --coverage  # Run tests with coverage
npm run build           # Build production
```

---

## Troubleshooting

### Database Connection Failed
- Ensure PostgreSQL service is running in CI
- Check `DATABASE_URL` format
- Verify Prisma migrations are up to date

### Tests Timing Out
- Increase `timeout` in workflow or test files
- Check for long-running database queries
- Ensure services (like PostgreSQL) start before tests

### Build Failures
- Check Node.js version compatibility
- Verify all environment variables are set
- Run locally to reproduce

### Deployment Issues
- Verify secrets are correctly configured
- Check API credentials haven't expired
- Review deploy logs in Render/Vercel dashboard

---

## Performance Tips

1. **Cache Dependencies**
   - NPM packages cached automatically
   - Clear cache if dependencies corrupted

2. **Parallel Jobs**
   - Server and Client jobs run in parallel
   - Reduces total CI time

3. **Conditional Steps**
   - Use `if:` conditions to skip unnecessary steps
   - Only deploy on successful builds

4. **Skip CI**
   - Add `[skip ci]` to commit message to skip workflow
   - Use for documentation-only changes

---

## Monitoring & Notifications

### View Workflow Runs
- **Actions tab** in repository
- Filter by workflow, status, branch
- Click run for detailed logs

### Failed Workflows
1. Check error logs in GitHub UI
2. Review relevant code changes
3. Fix issues and push new commit
4. Workflow re-runs automatically

### Status Badges
Add to README:
```markdown
![CI](https://github.com/yourusername/ChatlockUP/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/yourusername/ChatlockUP/actions/workflows/deploy.yml/badge.svg)
```

---

## Future Enhancements

- [ ] Codecov integration for coverage reports
- [ ] Slack/Discord notifications on failures
- [ ] Automated semantic versioning
- [ ] Docker image builds and pushes
- [ ] Performance benchmarking
- [ ] Security scanning (Snyk, OWASP)
- [ ] Load testing before deployment
- [ ] Database backup before deploy
