# Contributing to ChatlockUP

Thank you for your interest in contributing to ChatlockUP! This document provides guidelines for contributing code, reporting issues, and submitting pull requests.

## Code of Conduct

- Be respectful and inclusive
- No harassment or discrimination
- Constructive feedback only
- Focus on the work, not the person

## Getting Started

### Prerequisites
- Node.js ≥ 18.0.0
- PostgreSQL 14+
- Git

### Local Setup

```bash
# Clone repository
git clone https://github.com/yourusername/ChatlockUP.git
cd ChatlockUP

# Install server dependencies
cd server
npm install
cp .env.example .env  # Configure database and JWT secret
npx prisma migrate dev
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### Running Locally

**Terminal 1 - Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Client:**
```bash
cd client
npm start
# Client runs on http://localhost:3000
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming convention:**
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation
- `refactor/` — Code refactoring
- `hotfix/` — Production hotfixes

### 2. Make Changes

- Write clean, readable code
- Add comments for complex logic
- Follow existing code style
- Test your changes locally

### 3. Commit Changes

```bash
git add .
git commit -m "feat(module): description of changes"
```

**Commit message format:** `<type>(<scope>): <subject>`

**Valid types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation update
- `style` — Code style (no logic change)
- `refactor` — Code refactoring
- `perf` — Performance improvement
- `test` — Test changes
- `chore` — Build/tooling changes
- `ci` — CI/CD changes

**Examples:**
```bash
git commit -m "feat(auth): add two-factor authentication"
git commit -m "fix(websocket): prevent duplicate messages"
git commit -m "docs(api): update endpoint documentation"
git commit -m "chore(deps): upgrade dependencies"
```

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Go to GitHub and open a Pull Request. Fill out the PR template completely.

### 5. Address Code Review

- Review comments from maintainers
- Make requested changes
- Push commits (don't squash during review)
- Re-request review when ready

### 6. Merge

Once approved and CI passes, maintainer will merge to `main`.

---

## Coding Standards

### JavaScript/Node.js

```javascript
// Use const/let, not var
const value = 42;
let mutable = 'can change';

// Use arrow functions
const add = (a, b) => a + b;

// Async/await over .then()
async function fetchUser(id) {
  try {
    const user = await db.findById(id);
    return user;
  } catch (err) {
    console.error('Error fetching user:', err);
    throw err;
  }
}

// Destructuring
const { username, email } = user;

// Template literals
const message = `Hello, ${username}!`;
```

### React Components

```javascript
// Use functional components with hooks
import { useState, useEffect } from 'react';

export default function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  return (
    <div className="component">
      <h1>{prop1}</h1>
    </div>
  );
}
```

### File Organization

**Server:**
```
server/
├── routes/        # API endpoints
├── models/        # Database models
├── middleware/    # Express middleware
├── prisma/        # Database schema
├── index.js       # Entry point
└── db.js          # Database connection
```

**Client:**
```
client/
├── src/
│   ├── components/  # React components
│   ├── crypto/      # Encryption logic
│   ├── App.js       # Root component
│   └── index.js     # Entry point
└── public/          # Static files
```

### Naming Conventions

- **Constants:** `UPPER_SNAKE_CASE`
- **Variables/Functions:** `camelCase`
- **Classes/Components:** `PascalCase`
- **CSS Classes:** `kebab-case`
- **Database Tables:** `snake_case`

### Comments

```javascript
// Use single-line comments for quick notes
// Multi-line explanation of complex logic
// Use block comments for file headers and sections

/**
 * JSDoc for functions with parameters and return types
 * @param {string} username - User's username
 * @returns {Promise<User>} User object
 */
async function getUserByUsername(username) {
  // implementation
}
```

---

## Testing

### Add Tests

- Write tests for new features
- Write tests for bug fixes (regression)
- Aim for ≥80% coverage

### Run Tests

```bash
# Server
cd server
npm test

# Client
cd client
npm test -- --coverage
```

### Test File Naming

- `.test.js` or `.spec.js` extension
- Test files in same directory as source
- Example: `components/Button.jsx` → `components/Button.test.js`

---

## Security Considerations

### When Adding New Features

1. **Input Validation:** Validate and sanitize all user inputs
2. **Authentication:** Verify user identity
3. **Authorization:** Check permissions before actions
4. **Secrets:** Never commit `.env` or private keys
5. **Dependencies:** Check for vulnerabilities: `npm audit`
6. **Encryption:** Use established crypto libraries (libsodium)

### Security Review Checklist

- [ ] No hardcoded secrets or API keys
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use Prisma)
- [ ] CSRF protection if applicable
- [ ] HTTPS enforced in production
- [ ] Rate limiting applied
- [ ] Error messages don't leak sensitive info

---

## Documentation

### Update Docs When

- Adding new features
- Changing existing behavior
- Adding new endpoints/functions
- Modifying database schema

### Documentation Files

- **API endpoints:** Update in README or `/docs/API.md`
- **Database schema:** Update in Prisma schema comments
- **Setup instructions:** Update README.md
- **Code examples:** Add to relevant section

---

## Submitting Issues

### Bug Report

```markdown
## Description
Clear description of the issue.

## Steps to Reproduce
1. Step one
2. Step two
3. Actual result

## Expected Behavior
What should happen.

## Environment
- OS: macOS 14.2
- Node.js: 20.10
- Browser: Chrome 120
- Branch: main

## Logs
```
Error message here
```
```

### Feature Request

```markdown
## Description
Summary of the feature request.

## Use Case
Why is this needed? Who benefits?

## Proposed Solution
How should this work?

## Alternatives
Other approaches considered.
```

---

## Pull Request Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Changes Made
- Detailed list of changes
- What was modified
- Why it was changed

## Testing
- [ ] Added tests
- [ ] Tests pass locally
- [ ] No breaking changes

## Checklist
- [ ] Code follows style guide
- [ ] Self-reviewed code
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
```

---

## CI/CD Pipeline

All PRs automatically run:

1. **Linting** — Code style check
2. **Unit Tests** — Functionality verification
3. **Build** — Production build verification
4. **Security Audit** — Dependency vulnerability scan

**All checks must pass before merging.**

See [CI_CD_GUIDE.md](.github/CI_CD_GUIDE.md) for details.

---

## Performance & Optimization

### Before Committing

- [ ] No console.log() left in code
- [ ] No unused imports/variables
- [ ] Optimized images and assets
- [ ] Database queries optimized
- [ ] No memory leaks

### Performance Review

For significant performance changes, include:
- Before/after metrics
- Benchmark results
- Explanation of optimization

---

## Getting Help

- **Questions:** Open a Discussion
- **Bugs:** Create an Issue
- **Features:** Create an Issue with enhancement label
- **Security:** Email security@yourdomain.com

---

## Recognition

Contributors will be recognized:
- In CONTRIBUTORS.md
- In release notes
- On project website

Thank you for contributing! 🚀
