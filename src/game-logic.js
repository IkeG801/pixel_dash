// Pixel Dash Game Logic (Testable)
// Core game mechanics extracted for testing

// Game constants
const TILE = 32;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4.5;
const FRICTION = 0.85;

// Collision detection
function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Player state initialization
function initPlayer(x = 50, y = 440) {
  return {
    x: x,
    y: y,
    w: 20,
    h: 28,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
    jumpBuffer: 0,
    coyoteTime: 0,
  };
}

// Camera state initialization
function initCamera(x = 0, y = 0) {
  return { x: x, y: y };
}

// Validate if a player is valid
function isValidPlayer(player) {
  return player &&
    typeof player.x === 'number' &&
    typeof player.y === 'number' &&
    typeof player.vx === 'number' &&
    typeof player.vy === 'number' &&
    typeof player.w === 'number' &&
    typeof player.h === 'number' &&
    typeof player.grounded === 'boolean';
}

// Check if player has died (fallen too far)
function isPlayerDead(player, deathY) {
  return player.y > deathY;
}

// Apply gravity to player
function applyGravity(player) {
  const updated = { ...player };
  updated.vy += GRAVITY;
  if (updated.vy > 15) updated.vy = 15;
  return updated;
}

// Apply movement input
function applyMovement(player, moveX) {
  const updated = { ...player };
  updated.vx += moveX * 1.2;
  updated.vx *= FRICTION;
  if (Math.abs(updated.vx) > MOVE_SPEED) {
    updated.vx = MOVE_SPEED * Math.sign(updated.vx);
  }
  if (Math.abs(updated.vx) < 0.1) updated.vx = 0;
  if (moveX !== 0) updated.facing = moveX;
  return updated;
}

// Update coyote time (frames where jump is still possible after leaving ground)
function updateCoyoteTime(player, grounded) {
  const updated = { ...player };
  if (grounded) {
    updated.coyoteTime = 6;
  } else {
    updated.coyoteTime--;
  }
  return updated;
}

// Update jump buffer (frames where jump input is remembered)
function updateJumpBuffer(player, jumpPressed) {
  const updated = { ...player };
  if (jumpPressed) {
    updated.jumpBuffer = 6;
  } else {
    updated.jumpBuffer--;
  }
  return updated;
}

// Apply jump if conditions are met
function applyJump(player, shouldJump) {
  const updated = { ...player };
  if (shouldJump && updated.jumpBuffer > 0 && updated.coyoteTime > 0) {
    updated.vy = JUMP_FORCE;
    updated.jumpBuffer = 0;
    updated.coyoteTime = 0;
    return { ...updated, jumped: true };
  }
  return updated;
}

// Check coin collection
function collectCoins(player, coins) {
  const collected = [];
  const remaining = coins.map((coin, idx) => {
    if (!coin.collected && rectCollide(player, coin)) {
      collected.push(idx);
      return { ...coin, collected: true };
    }
    return coin;
  });
  return { coins: remaining, collected, coinsCollected: collected.length };
}

// Check level completion (reaching final platform's top)
function checkLevelCompletion(player, platforms) {
  if (platforms.length === 0) return false;
  const finish = platforms[platforms.length - 1];
  return rectCollide(player, {
    x: finish.x,
    y: finish.y - 40,
    w: finish.w,
    h: 40,
  });
}

// Horizontal collision with platforms
function resolveHorizontalCollision(player, platforms) {
  const updated = { ...player };
  const oldX = updated.x;
  updated.x += updated.vx;

  platforms.forEach((pl) => {
    if (!pl.visible && pl.visible !== undefined) return;
    if (rectCollide(updated, pl)) {
      if (updated.vx > 0) {
        updated.x = pl.x - updated.w;
      } else if (updated.vx < 0) {
        updated.x = pl.x + pl.w;
      }
      updated.vx = 0;
    }
  });

  return updated;
}

// Vertical collision with platforms
function resolveVerticalCollision(player, platforms) {
  const updated = { ...player };
  const oldY = updated.y;
  updated.y += updated.vy;
  updated.grounded = false;

  const crumblingPlatforms = [];

  platforms.forEach((pl, idx) => {
    if (!pl.visible && pl.visible !== undefined) return;

    if (rectCollide(updated, pl)) {
      const wasAbove = oldY + updated.h <= pl.y;
      const wasBelow = oldY >= pl.y + pl.h;

      if (wasAbove && updated.vy >= 0) {
        updated.y = pl.y - updated.h;
        updated.grounded = true;
        updated.vy = 0;

        if (pl.type === 2 && !pl.crumbling) {
          crumblingPlatforms.push(idx);
        }
      } else if (wasBelow && updated.vy < 0) {
        updated.y = pl.y + pl.h;
        updated.vy = 0;
      }
    }
  });

  return { ...updated, crumblingPlatforms };
}

// Validate a level structure
function isValidLevel(level) {
  return (
    level &&
    Array.isArray(level.platforms) &&
    Array.isArray(level.coins) &&
    Array.isArray(level.spikes) &&
    level.platforms.length > 0
  );
}

// Calculate score from level completion
function calculateLevelScore(timeInFrames) {
  const timeInSeconds = Math.floor(timeInFrames / 60);
  const bonus = Math.max(0, 1000 - timeInSeconds * 10);
  return Math.max(100, bonus);
}

// Player data validation
function isValidPlayerData(data) {
  return (
    data &&
    typeof data.player_name === 'string' &&
    typeof data.total_coins === 'number' &&
    typeof data.challenge_points === 'number' &&
    typeof data.level_completed === 'number'
  );
}

// Color utilities
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Export for use in game and tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Constants
    TILE,
    GRAVITY,
    JUMP_FORCE,
    MOVE_SPEED,
    FRICTION,
    // Core functions
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
  };
}
