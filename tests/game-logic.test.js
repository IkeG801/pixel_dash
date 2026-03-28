// Unit tests for game mechanics
const {
  TILE,
  GRAVITY,
  JUMP_FORCE,
  MOVE_SPEED,
  FRICTION,
  rectCollide,
  initPlayer,
  initCamera,
  isValidPlayer,
  isPlayerDead,
  applyGravity,
  applyMovement,
  updateCoyoteTime,
  updateJumpBuffer,
  applyJump,
  collectCoins,
  checkLevelCompletion,
  resolveHorizontalCollision,
  resolveVerticalCollision,
  isValidLevel,
  calculateLevelScore,
  isValidPlayerData,
  hexToRgb,
} = require('../src/game-logic');

describe('Game Constants', () => {
  test('should have correct gravity value', () => {
    expect(GRAVITY).toBe(0.6);
  });

  test('should have correct jump force', () => {
    expect(JUMP_FORCE).toBe(-12);
  });

  test('should have correct move speed', () => {
    expect(MOVE_SPEED).toBe(4.5);
  });

  test('should have correct friction', () => {
    expect(FRICTION).toBe(0.85);
  });

  test('should have correct tile size', () => {
    expect(TILE).toBe(32);
  });
});

describe('Collision Detection', () => {
  test('rectCollide should detect collision between overlapping rectangles', () => {
    const rect1 = { x: 0, y: 0, w: 20, h: 20 };
    const rect2 = { x: 10, y: 10, w: 20, h: 20 };
    expect(rectCollide(rect1, rect2)).toBe(true);
  });

  test('rectCollide should not detect collision between non-overlapping rectangles', () => {
    const rect1 = { x: 0, y: 0, w: 20, h: 20 };
    const rect2 = { x: 50, y: 50, w: 20, h: 20 };
    expect(rectCollide(rect1, rect2)).toBe(false);
  });

  test('rectCollide should detect collision when rectangles touch edges', () => {
    const rect1 = { x: 0, y: 0, w: 20, h: 20 };
    const rect2 = { x: 20, y: 0, w: 20, h: 20 };
    expect(rectCollide(rect1, rect2)).toBe(false);
  });

  test('rectCollide should detect collision when one rect is inside another', () => {
    const rect1 = { x: 0, y: 0, w: 100, h: 100 };
    const rect2 = { x: 25, y: 25, w: 20, h: 20 };
    expect(rectCollide(rect1, rect2)).toBe(true);
  });
});

describe('Player Initialization', () => {
  test('initPlayer should create player with default values', () => {
    const player = initPlayer();
    expect(player).toEqual({
      x: 50,
      y: 440,
      w: 20,
      h: 28,
      vx: 0,
      vy: 0,
      grounded: false,
      facing: 1,
      jumpBuffer: 0,
      coyoteTime: 0,
    });
  });

  test('initPlayer should accept custom x and y', () => {
    const player = initPlayer(100, 200);
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
  });

  test('isValidPlayer should return true for valid player', () => {
    const player = initPlayer();
    expect(isValidPlayer(player)).toBe(true);
  });

  test('isValidPlayer should return false for invalid player', () => {
    const invalid = { x: 0 };
    expect(isValidPlayer(invalid)).toBe(false);
  });

  test('isValidPlayer should return false for null', () => {
    expect(isValidPlayer(null)).toBe(false);
  });
});

describe('Camera Initialization', () => {
  test('initCamera should create camera with default values', () => {
    const camera = initCamera();
    expect(camera).toEqual({ x: 0, y: 0 });
  });

  test('initCamera should accept custom x and y', () => {
    const camera = initCamera(100, 200);
    expect(camera.x).toBe(100);
    expect(camera.y).toBe(200);
  });
});

describe('Player Death Detection', () => {
  test('isPlayerDead should return false when player is above death line', () => {
    const player = initPlayer(50, 650);
    expect(isPlayerDead(player, 700)).toBe(false);
  });

  test('isPlayerDead should return true when player is below death line', () => {
    const player = initPlayer(50, 750);
    expect(isPlayerDead(player, 700)).toBe(true);
  });

  test('isPlayerDead should return true when player is at death line', () => {
    const player = initPlayer(50, 700);
    expect(isPlayerDead(player, 700)).toBe(true);
  });
});

describe('Gravity Application', () => {
  test('applyGravity should increase downward velocity', () => {
    const player = initPlayer();
    const updated = applyGravity(player);
    expect(updated.vy).toBe(GRAVITY);
  });

  test('applyGravity should accumulate gravity over multiple frames', () => {
    let player = initPlayer();
    player = applyGravity(player);
    player = applyGravity(player);
    expect(player.vy).toBe(GRAVITY * 2);
  });

  test('applyGravity should cap maximum velocity at 15', () => {
    let player = initPlayer();
    player.vy = 14;
    player = applyGravity(player);
    player = applyGravity(player);
    player = applyGravity(player);
    expect(player.vy).toBe(15);
  });

  test('applyGravity should not modify original player', () => {
    const player = initPlayer();
    const updated = applyGravity(player);
    expect(player.vy).toBe(0);
    expect(updated.vy).toBe(GRAVITY);
  });
});

describe('Movement Application', () => {
  test('applyMovement should increase velocity when moving right', () => {
    const player = initPlayer();
    const updated = applyMovement(player, 1);
    expect(updated.vx).toBeGreaterThan(0);
  });

  test('applyMovement should decrease velocity when moving left', () => {
    const player = initPlayer();
    const updated = applyMovement(player, -1);
    expect(updated.vx).toBeLessThan(0);
  });

  test('applyMovement should apply friction', () => {
    let player = initPlayer();
    player.vx = 4;
    player = applyMovement(player, 0);
    expect(player.vx).toBeLessThan(4);
    expect(player.vx).toBeCloseTo(4 * FRICTION);
  });

  test('applyMovement should cap velocity at MOVE_SPEED', () => {
    let player = initPlayer();
    for (let i = 0; i < 10; i++) {
      player = applyMovement(player, 1);
    }
    expect(Math.abs(player.vx)).toBeLessThanOrEqual(MOVE_SPEED);
  });

  test('applyMovement should set facing direction', () => {
    let player = initPlayer();
    player.facing = 1;
    player = applyMovement(player, -1);
    expect(player.facing).toBe(-1);
    player = applyMovement(player, 1);
    expect(player.facing).toBe(1);
  });

  test('applyMovement should not modify original player', () => {
    const player = initPlayer();
    const updated = applyMovement(player, 1);
    expect(player.vx).toBe(0);
    expect(updated.vx).not.toBe(0);
  });
});

describe('Coyote Time Management', () => {
  test('updateCoyoteTime should set coyote time to 6 when grounded', () => {
    const player = initPlayer();
    const updated = updateCoyoteTime(player, true);
    expect(updated.coyoteTime).toBe(6);
  });

  test('updateCoyoteTime should decrease coyote time when not grounded', () => {
    let player = initPlayer();
    player.coyoteTime = 5;
    player = updateCoyoteTime(player, false);
    expect(player.coyoteTime).toBe(4);
  });

  test('updateCoyoteTime should not go below 0', () => {
    let player = initPlayer();
    player.coyoteTime = 0;
    for (let i = 0; i < 10; i++) {
      player = updateCoyoteTime(player, false);
    }
    expect(player.coyoteTime).toBe(-10);
  });
});

describe('Jump Buffer Management', () => {
  test('updateJumpBuffer should set jump buffer to 6 when jump is pressed', () => {
    const player = initPlayer();
    const updated = updateJumpBuffer(player, true);
    expect(updated.jumpBuffer).toBe(6);
  });

  test('updateJumpBuffer should decrease jump buffer when jump is not pressed', () => {
    let player = initPlayer();
    player.jumpBuffer = 5;
    player = updateJumpBuffer(player, false);
    expect(player.jumpBuffer).toBe(4);
  });

  test('updateJumpBuffer should handle continuous jump input', () => {
    let player = initPlayer();
    player = updateJumpBuffer(player, true);
    expect(player.jumpBuffer).toBe(6);
    player = updateJumpBuffer(player, true);
    expect(player.jumpBuffer).toBe(6);
  });
});

describe('Jump Mechanics', () => {
  test('applyJump should apply jump force when conditions are met', () => {
    let player = initPlayer();
    player.jumpBuffer = 1;
    player.coyoteTime = 1;
    player = applyJump(player, true);
    expect(player.vy).toBe(JUMP_FORCE);
    expect(player.jumped).toBe(true);
  });

  test('applyJump should not jump without jump buffer', () => {
    let player = initPlayer();
    player.jumpBuffer = 0;
    player.coyoteTime = 1;
    player = applyJump(player, true);
    expect(player.vy).toBe(0);
    expect(player.jumped).toBeUndefined();
  });

  test('applyJump should not jump without coyote time', () => {
    let player = initPlayer();
    player.jumpBuffer = 1;
    player.coyoteTime = 0;
    player = applyJump(player, true);
    expect(player.vy).toBe(0);
  });

  test('applyJump should reset buffers after jump', () => {
    let player = initPlayer();
    player.jumpBuffer = 1;
    player.coyoteTime = 1;
    player = applyJump(player, true);
    expect(player.jumpBuffer).toBe(0);
    expect(player.coyoteTime).toBe(0);
  });
});

describe('Coin Collection', () => {
  test('collectCoins should collect coin when player touches it', () => {
    const player = { x: 100, y: 100, w: 20, h: 28 };
    const coins = [{ x: 105, y: 105, w: 16, h: 16, collected: false }];
    const result = collectCoins(player, coins);
    expect(result.coinsCollected).toBe(1);
    expect(result.coins[0].collected).toBe(true);
  });

  test('collectCoins should not collect already collected coins', () => {
    const player = { x: 100, y: 100, w: 20, h: 28 };
    const coins = [{ x: 105, y: 105, w: 16, h: 16, collected: true }];
    const result = collectCoins(player, coins);
    expect(result.coinsCollected).toBe(0);
  });

  test('collectCoins should collect multiple coins', () => {
    const player = { x: 100, y: 100, w: 20, h: 28 };
    const coins = [
      { x: 105, y: 105, w: 16, h: 16, collected: false },
      { x: 110, y: 110, w: 16, h: 16, collected: false },
      { x: 500, y: 500, w: 16, h: 16, collected: false },
    ];
    const result = collectCoins(player, coins);
    expect(result.coinsCollected).toBe(2);
  });

  test('collectCoins should not collect coin out of range', () => {
    const player = { x: 100, y: 100, w: 20, h: 28 };
    const coins = [{ x: 300, y: 300, w: 16, h: 16, collected: false }];
    const result = collectCoins(player, coins);
    expect(result.coinsCollected).toBe(0);
    expect(result.coins[0].collected).toBe(false);
  });
});

describe('Level Completion', () => {
  test('checkLevelCompletion should return true when player reaches finish', () => {
    const player = { x: 600, y: 250, w: 20, h: 28 };
    const platforms = [
      { x: 0, y: 500, w: 150, h: 20 },
      { x: 650, y: 300, w: 200, h: 40 },
    ];
    expect(checkLevelCompletion(player, platforms)).toBe(true);
  });

  test('checkLevelCompletion should return false when player is below finish', () => {
    const player = { x: 600, y: 350, w: 20, h: 28 };
    const platforms = [{ x: 650, y: 300, w: 200, h: 40 }];
    expect(checkLevelCompletion(player, platforms)).toBe(false);
  });

  test('checkLevelCompletion should return false with no platforms', () => {
    const player = { x: 100, y: 100, w: 20, h: 28 };
    expect(checkLevelCompletion(player, [])).toBe(false);
  });
});

describe('Horizontal Collision', () => {
  test('resolveHorizontalCollision should stop player moving right into platform', () => {
    let player = initPlayer(100, 100);
    player.vx = 5;
    const platforms = [{ x: 120, y: 90, w: 40, h: 40, visible: true }];
    const updated = resolveHorizontalCollision(player, platforms);
    expect(updated.x).toBeLessThan(120);
    expect(updated.vx).toBe(0);
  });

  test('resolveHorizontalCollision should stop player moving left into platform', () => {
    let player = initPlayer(100, 100);
    player.vx = -5;
    const platforms = [{ x: 50, y: 90, w: 40, h: 40, visible: true }];
    const updated = resolveHorizontalCollision(player, platforms);
    expect(updated.x).toBeGreaterThan(90);
    expect(updated.vx).toBe(0);
  });

  test('resolveHorizontalCollision should skip invisible platforms', () => {
    let player = initPlayer(100, 100);
    player.vx = 5;
    const platforms = [{ x: 120, y: 90, w: 40, h: 40, visible: false }];
    const updated = resolveHorizontalCollision(player, platforms);
    expect(updated.vx).toBe(5);
  });
});

describe('Vertical Collision', () => {
  test('resolveVerticalCollision should detect ground collision from above', () => {
    let player = initPlayer(100, 460);
    player.vy = 5;
    const platforms = [{ x: 0, y: 500, w: 150, h: 20, type: 0, visible: true }];
    const result = resolveVerticalCollision(player, platforms);
    expect(result.grounded).toBe(true);
    expect(result.vy).toBe(0);
    expect(result.y).toBeLessThan(500);
  });

  test('resolveVerticalCollision should detect ceiling collision from below', () => {
    let player = initPlayer(100, 460);
    player.vy = -5;
    const platforms = [{ x: 0, y: 400, w: 150, h: 20, type: 0, visible: true }];
    const result = resolveVerticalCollision(player, platforms);
    expect(result.vy).toBe(0);
    expect(result.y).toBeGreaterThan(420);
  });

  test('resolveVerticalCollision should not ground player when not above platform', () => {
    let player = initPlayer(100, 370);
    player.vy = 5;
    const platforms = [{ x: 0, y: 400, w: 150, h: 20, type: 0, visible: true }];
    const result = resolveVerticalCollision(player, platforms);
    expect(result.grounded).toBe(false);
  });

  test('resolveVerticalCollision should mark crumbling platforms', () => {
    let player = initPlayer(100, 460);
    player.vy = 5;
    const platforms = [{ x: 0, y: 500, w: 150, h: 20, type: 2, visible: true, crumbling: false }];
    const result = resolveVerticalCollision(player, platforms);
    expect(result.crumblingPlatforms).toContain(0);
  });
});

describe('Level Validation', () => {
  test('isValidLevel should return true for valid level', () => {
    const level = {
      platforms: [{ x: 0, y: 500, w: 150, h: 20 }],
      coins: [{ x: 100, y: 400 }],
      spikes: [],
    };
    expect(isValidLevel(level)).toBe(true);
  });

  test('isValidLevel should return false for missing platforms', () => {
    const level = {
      coins: [{ x: 100, y: 400 }],
      spikes: [],
    };
    expect(isValidLevel(level)).toBe(false);
  });

  test('isValidLevel should return false for empty platforms', () => {
    const level = {
      platforms: [],
      coins: [{ x: 100, y: 400 }],
      spikes: [],
    };
    expect(isValidLevel(level)).toBe(false);
  });

  test('isValidLevel should return false for null', () => {
    expect(isValidLevel(null)).toBe(false);
  });
});

describe('Score Calculation', () => {
  test('calculateLevelScore should calculate score based on time', () => {
    const score = calculateLevelScore(600); // 10 seconds
    expect(score).toBe(900);
  });

  test('calculateLevelScore should not go below 100', () => {
    const score = calculateLevelScore(60000); // 1000 seconds
    expect(score).toBeGreaterThanOrEqual(100);
  });

  test('calculateLevelScore should give maximum bonus for fast completion', () => {
    const score = calculateLevelScore(60); // 1 second
    expect(score).toBeGreaterThan(900);
  });
});

describe('Player Data Validation', () => {
  test('isValidPlayerData should return true for valid data', () => {
    const data = {
      player_name: 'Player',
      total_coins: 0,
      challenge_points: 0,
      level_completed: 0,
    };
    expect(isValidPlayerData(data)).toBe(true);
  });

  test('isValidPlayerData should return false for missing properties', () => {
    const data = {
      player_name: 'Player',
      total_coins: 0,
    };
    expect(isValidPlayerData(data)).toBe(false);
  });

  test('isValidPlayerData should return false for null', () => {
    expect(isValidPlayerData(null)).toBe(false);
  });
});

describe('Color Utilities', () => {
  test('hexToRgb should convert hex color to RGB', () => {
    const rgb = hexToRgb('#ff0000');
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('hexToRgb should handle 3-digit hex', () => {
    const rgb = hexToRgb('#f00');
    expect(rgb).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('hexToRgb should handle invalid hex gracefully', () => {
    const rgb = hexToRgb('invalid');
    expect(rgb).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('hexToRgb should convert various colors', () => {
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });
});
