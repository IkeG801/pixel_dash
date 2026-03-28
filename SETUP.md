# Quick Start Guide for Pixel Dash Testing

## Prerequisites

You need to have Node.js 16+ and npm installed on your system.

### Install Node.js

**macOS (using Homebrew):**
```bash
brew install node
```

**Windows:**
Download and install from https://nodejs.org/

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install nodejs npm
```

**Linux (using nvm - recommended):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

## Setup

1. **Navigate to the project directory:**
```bash
cd pixel_dash
```

2. **Install dependencies:**
```bash
npm install
```

This will install:
- Jest (testing framework)
- jest-environment-jsdom (for DOM mocking)

## Running Tests

### Run all tests once
```bash
npm test
```

### Run tests in watch mode (recommended for development)
```bash
npm run test:watch
```

This will:
- Run tests automatically when files change
- Allow you to filter tests by name
- Show coverage in real-time

### Run tests with coverage report
```bash
npm run test:coverage
```

This generates:
- Terminal summary
- HTML coverage report in `coverage/index.html`
- LCOV format for CI/CD integration

## Test Files

- **tests/game-logic.test.js** - 80+ unit tests for core mechanics
- **tests/integration.test.js** - Integration tests for game systems
- **tests/setup.js** - Jest configuration and mocks

## Expected Output

When you run `npm test`, you should see:

```
PASS  tests/game-logic.test.js
  Game Constants
    ✓ should have correct gravity value (1 ms)
    ✓ should have correct jump force (0 ms)
    ...
  Collision Detection
    ✓ rectCollide should detect collision between overlapping rectangles (0 ms)
    ...

PASS  tests/integration.test.js
  Player Data Persistence
    ✓ should save player data to localStorage (1 ms)
    ...

Test Suites: 2 passed, 2 total
Tests:       100+ passed, 100+ total
Snapshots:   0 total
Time:        2.234 s
```

## Continuous Integration

Every time you push to GitHub, the workflow in `.github/workflows/test-and-deploy.yml` will:

1. ✅ Run all tests
2. ✅ Generate coverage reports
3. ✅ Deploy to GitHub Pages (if on main/master branch and tests pass)
4. ✅ Verify the deployed game loads correctly

## Debugging Tests

### Run a specific test file
```bash
npm test -- tests/game-logic.test.js
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="Collision"
```

### Run with verbose output
```bash
npm test -- --verbose
```

### Debug with Node inspector
```bash
node --inspect-brk node_modules/.bin/jest
# Then open chrome://inspect in Chrome DevTools
```

## Coverage Goals

Current coverage targets:
- Line Coverage: 80%+
- Branch Coverage: 75%+
- Function Coverage: 80%

View HTML report:
```bash
npm run test:coverage
open coverage/index.html
```

## Common Issues

**Q: Tests fail with "Cannot find module"**
A: Run `npm install` again to ensure all dependencies are installed.

**Q: "jest: command not found"**
A: Jest is installed locally, use `npm test` instead of `jest` directly.

**Q: Tests pass locally but fail in GitHub Actions**
A: Check Node.js version compatibility. GitHub Actions uses 16.x, 18.x, and 20.x.

**Q: Coverage not being generated**
A: Use `npm run test:coverage` (requires `--coverage` flag for Jest).

## Next Steps

1. ✅ Install Node.js and npm
2. ✅ Run `npm install`
3. ✅ Run `npm test` to verify all tests pass
4. ✅ Read [TESTING.md](./TESTING.md) for detailed documentation
5. ✅ Push to GitHub to trigger CI/CD pipeline

## Files Modified/Created

```
├── .github/
│   └── workflows/
│       └── test-and-deploy.yml (CI/CD pipeline)
├── tests/
│   ├── game-logic.test.js (100+ unit tests)
│   ├── integration.test.js (integration tests)
│   └── setup.js (Jest mocks)
├── src/
│   └── game-logic.js (exported game functions)
├── jest.config.js (Jest configuration)
├── TESTING.md (detailed documentation)
├── SETUP.md (this file)
└── .gitignore (updated to exclude test artifacts)
```

For more details, see [TESTING.md](./TESTING.md).
