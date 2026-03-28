# Pixel Dash Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the Pixel Dash platformer game. The test suite ensures code quality, prevents regressions, and verifies that the game works correctly when deployed to GitHub Pages.

## Test Structure

The test suite is organized into three main categories:

### 1. Unit Tests (`tests/game-logic.test.js`)
Tests for individual game mechanics and pure functions that don't depend on the DOM or Canvas API.

**Coverage:**
- Game Constants (gravity, jump force, movement speed, etc.)
- Collision Detection
- Player State Management
- Physics (gravity, movement, friction)
- Jump Mechanics (coyote time, jump buffer)
- Level Progression
- Data Validation

**Example Tests:**
```javascript
describe('Collision Detection', () => {
  test('rectCollide should detect collision between overlapping rectangles', () => {
    const rect1 = { x: 0, y: 0, w: 20, h: 20 };
    const rect2 = { x: 10, y: 10, w: 20, h: 20 };
    expect(rectCollide(rect1, rect2)).toBe(true);
  });
});
```

### 2. Integration Tests (`tests/integration.test.js`)
Tests for how game systems work together, including:

**Coverage:**
- Player Data Persistence (localStorage)
- Game Configuration
- State Transitions
- Level Progression
- Coin/Score System
- Achievement System
- Death Streak Tracking

**Example Tests:**
```javascript
describe('Player Data Persistence', () => {
  test('should save and retrieve player data from localStorage', () => {
    const playerData = { player_name: 'Test', total_coins: 100 };
    localStorage.setItem('pixelDashPlayer', JSON.stringify(playerData));
    const retrieved = JSON.parse(localStorage.getItem('pixelDashPlayer'));
    expect(retrieved).toEqual(playerData);
  });
});
```

### 3. Test Setup (`tests/setup.js`)
Mocks and global configuration for the test environment:
- localStorage mock
- Canvas 2D context mock
- Audio Context mock
- DOM environment configuration

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- tests/game-logic.test.js
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="Collision"
```

## Test Coverage Goals

The test suite aims for:
- **Line Coverage:** ≥ 80%
- **Branch Coverage:** ≥ 75%
- **Function Coverage:** ≥ 80%

View coverage reports in:
```
coverage/
├── index.html (open in browser)
├── coverage-final.json
└── lcov.info
```

## Key Test Scenarios

### Physics & Movement
- ✓ Gravity application and velocity capping
- ✓ Horizontal and vertical collision detection
- ✓ Movement acceleration and friction
- ✓ Jump mechanics with coyote time and jump buffer
- ✓ Platform-specific physics (bouncy, ice, fan, etc.)

### Game Flow
- ✓ State transitions (menu → playing → dead/levelcomplete)
- ✓ Level loading and progression
- ✓ Player initialization and reset
- ✓ Game over detection (falling past death line)
- ✓ Level completion detection

### Data Management
- ✓ Player data serialization/deserialization
- ✓ localStorage persistence
- ✓ Configuration management
- ✓ Data validation
- ✓ Fallback to defaults

### Collectibles & Scoring
- ✓ Coin collection on collision
- ✓ Multiple coin collection
- ✓ Coin multiplier application
- ✓ Score calculation based on completion time
- ✓ Best score tracking

### Progression Systems
- ✓ Level completion tracking
- ✓ Achievement unlocking
- ✓ Challenge points accumulation
- ✓ Death streak tracking
- ✓ Cube skin unlocking

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test-and-deploy.yml`) automatically:

1. **Runs Tests** on every push and pull request
   - Tests across Node.js versions: 16.x, 18.x, 20.x
   - Generates coverage reports
   - Uploads coverage to Codecov

2. **Deploys to GitHub Pages** on push to main/master
   - Only after all tests pass
   - Automatically uploads game files
   - Provides live URL for the deployed game

3. **Verifies Deployed Game** 
   - Checks that GitHub Pages deployment succeeded
   - Tests that the HTML file loads correctly
   - Provides confidence that the live version works

## Debugging Failed Tests

### Check test output
```bash
npm test -- --verbose
```

### Debug a specific test
```bash
node --inspect-brk node_modules/.bin/jest tests/game-logic.test.js
# Then open chrome://inspect in Chrome
```

### Check what's mocked
Look in `tests/setup.js` to see what global objects are mocked for the test environment.

### Common Issues

**Issue:** "Canvas is not defined"
- **Solution:** The test setup mocks canvas automatically, ensure setup.js is loaded

**Issue:** "localStorage is not defined"
- **Solution:** Check that jest env is set to 'jsdom' in jest.config.js

**Issue:** Tests fail locally but pass in CI
- **Solution:** Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Adding New Tests

### 1. For new game mechanics
Add tests to `tests/game-logic.test.js`:
```javascript
describe('New Feature', () => {
  test('should do something', () => {
    const result = newFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### 2. For integration scenarios
Add tests to `tests/integration.test.js`:
```javascript
describe('New System', () => {
  test('should work with other systems', () => {
    // Arrange
    const state = initialState();
    
    // Act
    const result = performAction(state);
    
    // Assert
    expect(result).toHaveProperty('expectedProperty');
  });
});
```

### 3. Update game-logic.js
If adding new features:
1. Create testable functions in `src/game-logic.js`
2. Export functions using `module.exports`
3. Write tests before or alongside implementation
4. Import in game.js and use in the rendering loop

## Test Best Practices

✓ **Use descriptive test names** - explain what is being tested
✓ **Test one thing per test** - keeps tests focused
✓ **Use setup/teardown** - beforeEach clears mocks
✓ **Test edge cases** - boundaries, nulls, invalid inputs
✓ **Use fixtures** - create consistent test data
✓ **Keep tests fast** - avoid unnecessary delays
✓ **Mock external dependencies** - localStorage, Audio, Canvas

## Extending Test Coverage

Areas for future test expansion:
- [ ] Audio system tests (tone playback, sound effects)
- [ ] Canvas rendering tests (visual regression)
- [ ] Touch input handling tests
- [ ] Keyboard input tests
- [ ] Particle system tests
- [ ] Platform-specific behavior tests (crumbling, bouncy, ice, fan)
- [ ] Cube skin system tests
- [ ] Power-up mechanics tests
- [ ] Performance/memory leak tests
- [ ] Mobile responsiveness tests

## Related Files

- [package.json](../package.json) - Test dependencies and scripts
- [jest.config.js](../jest.config.js) - Jest configuration
- [src/game-logic.js](../src/game-logic.js) - Testable game logic
- [.github/workflows/test-and-deploy.yml](../.github/workflows/test-and-deploy.yml) - CI/CD pipeline

## Continuous Integration

The game is automatically tested and deployed on every push:

1. Tests run on GitHub Actions
2. Coverage reports are uploaded to Codecov
3. Game is deployed to GitHub Pages if tests pass
4. Deployed version is verified to load correctly

Check deployment status: https://github.com/yourusername/pixel_dash/actions
