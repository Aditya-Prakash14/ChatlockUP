# GitHub Configuration

This directory contains GitHub-specific configurations and automation workflows.

## Directory Structure

```
.github/
├── workflows/           # GitHub Actions workflows
│   ├── ci.yml          # Continuous integration (tests, linting, build)
│   ├── deploy.yml      # Deployment to Render and Vercel
│   ├── code-quality.yml # Code linting and formatting checks
│   └── pr-checks.yml   # Pull request validation
├── ISSUE_TEMPLATE/     # GitHub issue templates
│   ├── bug_report.md   # Bug report template
│   ├── feature_request.md # Feature request template
│   └── security_issue.md # Security vulnerability report
├── dependabot.yml      # Automated dependency updates
└── CI_CD_GUIDE.md      # Detailed CI/CD documentation
```

## Quick Links

- **[CI/CD Guide](./CI_CD_GUIDE.md)** — Complete documentation of workflows and setup
- **[Contributing Guide](../CONTRIBUTING.md)** — How to contribute to the project
- **[Workflows](./workflows/)** — GitHub Actions automation

## Workflows Summary

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | Push to main/develop, PRs | Run tests, linting, build verification |
| **Deploy** | Push to main | Deploy to Render (backend) and Vercel (frontend) |
| **Code Quality** | Push to main/develop, PRs | Run ESLint, Prettier, dependency audit |
| **PR Checks** | Pull requests | Validate PR format, commit messages, branch names |

## Setup Instructions

### 1. Configure Secrets

Go to **Repository Settings → Secrets and variables → Actions** and add:

```
RENDER_API_KEY         # From render.com
RENDER_SERVICE_ID      # Your backend service ID
VERCEL_TOKEN           # From vercel.com
VERCEL_ORG_ID          # Your organization ID
VERCEL_PROJECT_ID      # Your project ID
REACT_APP_API_URL      # Backend URL for React builds
```

### 2. Configure Branch Protection (Optional)

Go to **Settings → Branches → Add rule** for `main` branch:

- ✅ Require status checks to pass before merging
- ✅ Require code reviews (minimum 1)
- ✅ Dismiss stale reviews when new commits
- ✅ Require branches to be up to date

### 3. Enable Dependabot

- Dependabot is configured via `dependabot.yml`
- Automatically opens PRs for dependency updates
- Configure notifications in repository settings

## Local Development

### Before Pushing

Run locally to catch issues early:

```bash
# Format code
npx prettier --write .

# Lint
npx eslint . --fix

# Test (server)
cd server && npm test && cd ..

# Test (client)
cd client && npm test -- --coverage && cd ..

# Build
cd client && npm run build && cd ..
```

### Git Hooks (Recommended)

Install Husky for pre-commit hooks:

```bash
npm install husky --save-dev
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

## Troubleshooting

### Workflows Not Running

- Check if workflows are enabled: **Settings → Actions → General**
- Verify branch is not ignored
- Check for `[skip ci]` in commit message

### Failing Tests

- Run locally first
- Check GitHub Actions logs for error details
- Verify all environment variables are set

### Deployment Issues

- Verify secrets are correct and not expired
- Check Render and Vercel dashboards
- Review deploy logs for specific errors

## Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [GitHub Secrets Management](https://docs.github.com/actions/security-guides/encrypted-secrets)
- [Dependabot Documentation](https://docs.github.com/code-security/dependabot)
- [Branch Protection Rules](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-branch-protection-rules)

## Support

For issues or questions about CI/CD setup:
1. Check the [CI_CD_GUIDE.md](./CI_CD_GUIDE.md)
2. Review workflow logs in **Actions** tab
3. Create an issue with `[CI/CD]` label
