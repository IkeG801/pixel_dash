// Test to detect duplicate constant declarations
// This catches errors where constants are declared in multiple files

describe('Duplicate Constants Detection', () => {
  test('TILE should be defined in game-logic.js', () => {
    const { TILE } = require('../src/game-logic');
    expect(TILE).toBe(32);
  });

  test('GRAVITY should be defined in game-logic.js', () => {
    const { GRAVITY } = require('../src/game-logic');
    expect(GRAVITY).toBe(0.6);
  });

  test('JUMP_FORCE should be defined in game-logic.js', () => {
    const { JUMP_FORCE } = require('../src/game-logic');
    expect(JUMP_FORCE).toBe(-12);
  });

  test('MOVE_SPEED should be defined in game-logic.js', () => {
    const { MOVE_SPEED } = require('../src/game-logic');
    expect(MOVE_SPEED).toBe(4.5);
  });

  test('FRICTION should be defined in game-logic.js', () => {
    const { FRICTION } = require('../src/game-logic');
    expect(FRICTION).toBe(0.85);
  });

  test('collision detection function should be available', () => {
    const { rectCollide } = require('../src/game-logic');
    expect(typeof rectCollide).toBe('function');
  });

  test('game-logic exports all required constants and functions', () => {
    const gameLogic = require('../src/game-logic');
    
    // Check constants
    expect(gameLogic.TILE).toBeDefined();
    expect(gameLogic.GRAVITY).toBeDefined();
    expect(gameLogic.JUMP_FORCE).toBeDefined();
    expect(gameLogic.MOVE_SPEED).toBeDefined();
    expect(gameLogic.FRICTION).toBeDefined();
    
    // Check core functions
    expect(typeof gameLogic.rectCollide).toBe('function');
    expect(typeof gameLogic.initPlayer).toBe('function');
    expect(typeof gameLogic.applyGravity).toBe('function');
    expect(typeof gameLogic.applyMovement).toBe('function');
    expect(typeof gameLogic.updateCoyoteTime).toBe('function');
    expect(typeof gameLogic.updateJumpBuffer).toBe('function');
    expect(typeof gameLogic.applyJump).toBe('function');
  });
});

describe('HTML/Browser Loading', () => {
  test('game.js should not redeclare TILE (would cause SyntaxError)', () => {
    // This test ensures game.js doesn't have: const TILE = 32;
    // It should rely on game-logic.js via window globals instead
    
    const fs = require('fs');
    const gameJsContent = fs.readFileSync(__dirname + '/../src/game.js', 'utf8');
    
    // Should NOT have uncommented constant declarations
    const hasRedeclaredTile = /^const\s+TILE\s*=\s*32/m.test(gameJsContent);
    const hasRedeclaredGravity = /^const\s+(GRAVITY|JUMP_FORCE|MOVE_SPEED|FRICTION)\s*=/m.test(gameJsContent);
    
    expect(hasRedeclaredTile).toBe(false);
    expect(hasRedeclaredGravity).toBe(false);
  });

  test('index.html should load game-logic.js before game.js', () => {
    const fs = require('fs');
    const htmlContent = fs.readFileSync(__dirname + '/../index.html', 'utf8');
    
    const gameLogicPos = htmlContent.indexOf('game-logic.js');
    const gameJsPos = htmlContent.indexOf('src/game.js');
    
    expect(gameLogicPos).not.toBe(-1);
    expect(gameJsPos).not.toBe(-1);
    expect(gameLogicPos).toBeLessThan(gameJsPos);
  });

  test('game-logic.js exports should be available in Node.js context', () => {
    const gameLogic = require('../src/game-logic');
    
    // These must be exported for testing
    expect(gameLogic).toHaveProperty('TILE');
    expect(gameLogic).toHaveProperty('GRAVITY');
    expect(gameLogic).toHaveProperty('JUMP_FORCE');
    expect(gameLogic).toHaveProperty('MOVE_SPEED');
    expect(gameLogic).toHaveProperty('FRICTION');
  });
});
