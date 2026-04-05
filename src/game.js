// Pixel Dash Game Engine
// Game configuration and state management

const defaultConfig = {
  game_title: 'Pixel Dash',
  background_color: '#0f172a',
  surface_color: '#22d3ee',
  text_color: '#f0f9ff',
  primary_action: '#f59e0b',
  secondary_action: '#6366f1'
};

let config = { ...defaultConfig };

// Initialize player data early (before loadPlayerData is called)
let playerData = { 
  player_name: 'Player', 
  total_coins: 0, 
  challenge_points: 0, 
  sfxVolume: 0.85,
  musicVolume: 0.18,
  selected_cube: 'classic', 
  owned_cubes: 'classic', 
  level_completed: 0, 
  best_score: 0, 
  daily_score: 0, 
  daily_date: '', 
  unlockedAchievements: '', 
  deathStreak: 0 
};

// Initialize player data from localStorage
function loadPlayerData() {
  const saved = localStorage.getItem('pixelDashPlayer');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      playerData = { ...playerData, ...parsed };
    } catch (e) {
      console.error('Failed to parse playerData:', e);
      // Reset to default if corrupted
      playerData = { 
        player_name: 'Player', 
        total_coins: 0, 
        challenge_points: 0, 
        sfxVolume: 0.85,
        musicVolume: 0.18,
        selected_cube: 'classic', 
        owned_cubes: 'classic', 
        level_completed: 0, 
        best_score: 0, 
        daily_score: 0, 
        daily_date: '', 
        unlockedAchievements: '', 
        deathStreak: 0 
      };
      localStorage.setItem('pixelDashPlayer', JSON.stringify(playerData));
    }
  }
}

// Global error reporting for browser deploy debugging
window.addEventListener('error', event => {
  console.error('Global error:', event.message, 'at', event.filename + ':' + event.lineno + ':' + event.colno, event.error);
  if (!document.getElementById('pixelDashError')) {
    const div = document.createElement('div');
    div.id = 'pixelDashError';
    div.style.position = 'fixed';
    div.style.left = '0';
    div.style.right = '0';
    div.style.top = '0';
    div.style.padding = '15px';
    div.style.background = '#b91c1c';
    div.style.color = '#fff';
    div.style.zIndex = '9999';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '13px';
    div.innerText = `PixelDash Error: ${event.message} (check console)`;
    document.body.appendChild(div);
  }
});

function savePlayerData() {
  localStorage.setItem('pixelDashPlayer', JSON.stringify(playerData));
}

function resetSessionCurrencies() {
  playerData.total_coins = 0;
  playerData.challenge_points = 0;
}

// Load on startup
loadPlayerData();
playerData.sfxVolume = Number.isFinite(playerData.sfxVolume) ? Math.max(0, Math.min(1, playerData.sfxVolume)) : 0.85;
playerData.musicVolume = Number.isFinite(playerData.musicVolume) ? Math.max(0, Math.min(1, playerData.musicVolume)) : 0.18;
resetSessionCurrencies();
savePlayerData();

if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange: async (c) => {
      Object.assign(config, c);
    },
    mapToCapabilities: (c) => ({
      recolorables: [
        { get: () => c.background_color || defaultConfig.background_color, set: v => { c.background_color = v; window.elementSdk.setConfig({ background_color: v }); } },
        { get: () => c.surface_color || defaultConfig.surface_color, set: v => { c.surface_color = v; window.elementSdk.setConfig({ surface_color: v }); } },
        { get: () => c.text_color || defaultConfig.text_color, set: v => { c.text_color = v; window.elementSdk.setConfig({ text_color: v }); } },
        { get: () => c.primary_action || defaultConfig.primary_action, set: v => { c.primary_action = v; window.elementSdk.setConfig({ primary_action: v }); } },
        { get: () => c.secondary_action || defaultConfig.secondary_action, set: v => { c.secondary_action = v; window.elementSdk.setConfig({ secondary_action: v }); } }
      ],
      borderables: [],
      fontEditable: undefined,
      fontSizeable: undefined
    }),
    mapToEditPanelValues: (c) => new Map([
      ['game_title', c.game_title || defaultConfig.game_title]
    ])
  });
}

// Game Engine
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const keys = {};
let cheatCode = '';
window.addEventListener('keydown', e => { 
  keys[e.key] = true; 
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  
  // Cheat code detection: "POINTS" or "COINS"
  cheatCode += e.key.toUpperCase();
  if (cheatCode.includes('POINTS')) {
    playerData.challenge_points = (playerData.challenge_points || 0) + 500;
    savePlayerData();
    cheatCode = '';
  }
  if (cheatCode.includes('COINS')) {
    playerData.total_coins = (playerData.total_coins || 0) + 500;
    savePlayerData();
    cheatCode = '';
  }
  if (cheatCode.length > 10) cheatCode = cheatCode.slice(-10);
});
window.addEventListener('keyup', e => keys[e.key] = false);

// Touch controls
let touchLeft = false, touchRight = false, touchJump = false;

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Seeded PRNG for deterministic randomness (Mulberry32)
class SeededRandom {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }
  next() {
    let x = this.seed;
    x |= 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x = (x + 0x6d2b79f5) | 0) >>> 0) / 0x100000000;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
}

const particleRng = new SeededRandom();
const platformVisualRng = new SeededRandom(12345); // Fixed seed for consistent platform visuals
const ICE_FRICTION = 0.975;
const MAGMA_GEYSER_IDLE = 130;
const MAGMA_GEYSER_WARNING = 35;
const MAGMA_GEYSER_ERUPTION = 45;
const MAGMA_GEYSER_CYCLE = MAGMA_GEYSER_IDLE + MAGMA_GEYSER_WARNING + MAGMA_GEYSER_ERUPTION;
const ELEVATOR_MAX_DELTA = 3;
// const TILE = 32;              // from game-logic.js
// const GRAVITY = 0.6;          // from game-logic.js
// const JUMP_FORCE = -12;       // from game-logic.js
// const MOVE_SPEED = 4.5;       // from game-logic.js
// const FRICTION = 0.85;        // from game-logic.js

// Ensure spawn safety: guarantee a ground platform below the player start
function ensureSpawnPlatform(level) {
  const spawnX = 50;
  const spawnY = 440;
  const playerWidth = 20;
  const playerHeight = 28;
  const requiredRect = {
    x: spawnX - 10,
    y: spawnY + playerHeight,
    w: playerWidth + 20,
    h: 60
  };

  const intersects = (a, b) => {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  const hasSpawnPlatform = (level.platforms || []).some(p => {
    return intersects(requiredRect, { x: p.x, y: p.y, w: p.w, h: p.h });
  });

  if (!hasSpawnPlatform) {
    (level.platforms ||= []).push({ x: 30, y: 520, w: 160, h: 20, type: 0 });
  }

  return level;
}

// Smooth out extreme platform gaps/heights so jumps remain possible.
function ensurePlayableJumps(level) {
  const maxHorizontalGap = 155;
  // Sky levels are vertical, so they need much larger upward tolerance
  const maxUpwardStep = level.kingdom === 'sky' ? 300 : 175;
  const maxDownwardStep = level.kingdom === 'sky' ? 400 : 230;

  const orderedPlatforms = (level.platforms || []).slice().sort((a, b) => a.x - b.x);
  for (let i = 1; i < orderedPlatforms.length; i++) {
    const prev = orderedPlatforms[i - 1];
    const curr = orderedPlatforms[i];

    const prevRight = prev.x + prev.w;
    const gap = curr.x - prevRight;
    if (gap > maxHorizontalGap) {
      curr.x = prevRight + maxHorizontalGap;
    }

    // For Sky levels, only enforce vertical limits if platforms are close horizontally
    const isCloseHorizontally = Math.abs(curr.x - prev.x) < 180;
    
    const rise = prev.y - curr.y; // positive means next platform is higher
    if (isCloseHorizontally && rise > maxUpwardStep) {
      curr.y = prev.y - maxUpwardStep;
    }

    const drop = curr.y - prev.y; // positive means next platform is lower
    if (isCloseHorizontally && drop > maxDownwardStep) {
      curr.y = prev.y + maxDownwardStep;
    }
  }

  return level;
}

function horizontalOverlap(a, b) {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
}

function hasPlatformUnderSpike(spike, platforms) {
  const spikeBottom = spike.y + spike.h;
  return platforms.some(p => {
    const overlap = horizontalOverlap(spike, p);
    if (overlap < Math.min(10, spike.w * 0.5)) return false;
    const dy = p.y - spikeBottom;
    return dy >= -2 && dy <= 40;
  });
}

function sanitizeLevelLayout(level) {
  const platforms = level.platforms || [];
  const spikes = level.spikes || [];

  // Remove impossible crumble placements: if a crumble tile is tucked under another
  // platform with small vertical clearance and meaningful overlap, make it stable.
  platforms.forEach(p => {
    if (p.type !== 2) return;
    const blockedAbove = platforms.some(other => {
      if (other === p) return false;
      const overlap = horizontalOverlap(p, other);
      if (overlap < Math.min(36, p.w * 0.45)) return false;
      const clearance = p.y - (other.y + other.h);
      return clearance >= 0 && clearance < 88;
    });
    if (blockedAbove) {
      p.type = 0;
    }
  });

  // If spikes sit with platform support directly under them, shift them laterally.
  if (platforms.length > 0 && spikes.length > 0) {
    const minX = Math.min(...platforms.map(p => p.x)) - 80;
    const maxX = Math.max(...platforms.map(p => p.x + p.w)) + 80;
    const shiftOrder = [0, 36, -36, 72, -72, 108, -108, 144, -144, 180, -180];

    spikes.forEach(spike => {
      if (!hasPlatformUnderSpike(spike, platforms)) return;
      const originalX = spike.x;
      let moved = false;

      for (let i = 0; i < shiftOrder.length; i++) {
        const candidateX = Math.max(minX, Math.min(maxX - spike.w, originalX + shiftOrder[i]));
        const candidate = { ...spike, x: candidateX };
        if (!hasPlatformUnderSpike(candidate, platforms)) {
          spike.x = candidateX;
          moved = true;
          break;
        }
      }

      // Final fallback: park the spike off primary routes on the far side.
      if (!moved) {
        spike.x = Math.max(minX, Math.min(maxX - spike.w, originalX + 220));
      }
    });
  }

  return level;
}

// Generate level - just returns from INITIAL_LEVELS
// Validate INITIAL_LEVELS structure
function validateLevels(levels) {
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error('INITIAL_LEVELS must be a non-empty array');
  }
  levels.forEach((level, idx) => {
    if (!level.name || typeof level.name !== 'string') {
      throw new Error(`Level ${idx}: missing or invalid name`);
    }
    if (!Array.isArray(level.platforms) || level.platforms.length === 0) {
      throw new Error(`Level ${idx} (${level.name}): missing platforms`);
    }
    // Validate platform structure
    level.platforms.forEach((p, pidx) => {
      if (typeof p.x !== 'number' || typeof p.y !== 'number' || 
          typeof p.w !== 'number' || typeof p.h !== 'number') {
        throw new Error(`Level ${idx} platform ${pidx}: invalid coordinates`);
      }
    });
  });
  return true;
}

function generateLevel(levelNum) {
  const baseLevel = levelNum < INITIAL_LEVELS.length
    ? INITIAL_LEVELS[levelNum]
    : INITIAL_LEVELS[levelNum % INITIAL_LEVELS.length];

  // clone so modification does not mutate original definitions
  const clonedLevel = {
    ...baseLevel,
    // Fan platforms removed globally: convert type 3 to normal platforms.
    platforms: (baseLevel.platforms || []).map(p => {
      const normalized = { ...p, type: p.type === 3 ? 0 : p.type };
      if (Object.prototype.hasOwnProperty.call(normalized, 'fanForce')) {
        delete normalized.fanForce;
      }
      return normalized;
    }),
    coins: (baseLevel.coins || []).map(c => ({ ...c })),
    spikes: (baseLevel.spikes || []).map(s => ({ ...s })),
    obstacles: (baseLevel.obstacles || []).map(o => ({ ...o })),
    powerups: (baseLevel.powerups || []).map(u => ({ ...u }))
  };

  return ensureSpawnPlatform(ensurePlayableJumps(sanitizeLevelLayout(clonedLevel)));
}

// Daily Challenge Functions
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getDailyChallengeSeed() {
  const date = getTodayDate();
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateDailyLevel(seed) {
  let state = seed;
  const rng = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  const platformCount = 14 + Math.floor(rng() * 3);
  const platforms = [{ x: 0, y: 500, w: 150, h: 20, type: 0 }];

  let currentX = 180;
  let currentY = 450;
  for (let i = 1; i < platformCount; i++) {
    const platformWidth = 70 + Math.floor(rng() * 50);
    const yOffset = -15 - Math.floor(rng() * 15);
    const xOffset = 80 + Math.floor(rng() * 80);
    currentY = Math.max(180, Math.min(480, currentY + yOffset));
    currentX += xOffset;

    const typeRoll = rng();
    let type = 0;
    if (typeRoll > 0.75) type = 5;
    else if (typeRoll > 0.5) type = 2;
    else if (typeRoll > 0.25) type = 4;

    platforms.push({ x: currentX, y: currentY, w: platformWidth, h: 20, type });
  }

  const finalY = currentY - 80;
  platforms.push({ x: currentX + 120, y: finalY, w: 200, h: 40, type: 0 });

  const coins = [];
  for (let i = 0; i < platforms.length - 1; i++) {
    if (rng() > 0.5) {
      coins.push({
        x: platforms[i].x + platforms[i].w / 2 - 8,
        y: platforms[i].y - 35,
        w: 16,
        h: 16,
        collected: false
      });
    }
  }

  const spikes = [];
  for (let i = 1; i < platforms.length - 2; i++) {
    if (rng() > 0.75) {
      const gapX = (platforms[i].x + platforms[i + 1].x) / 2;
      spikes.push({
        x: gapX - 20,
        y: Math.max(platforms[i].y, platforms[i + 1].y) + 30,
        w: 40,
        h: 16,
        type: 0
      });
    }
  }

  const powerups = [];
  if (rng() > 0.5) {
    const pwIdx = 3 + Math.floor(rng() * (platforms.length - 6));
    powerups.push({
      x: platforms[pwIdx].x + platforms[pwIdx].w / 2 - 7,
      y: platforms[pwIdx].y - 40,
      w: 14,
      h: 14,
      collected: false,
      type: 'jumpboost'
    });
  }

  const rawLevel = {
    name: 'Daily Challenge ' + getTodayDate(),
    platforms,
    coins,
    spikes,
    obstacles: [],
    powerups
  };

  return ensureSpawnPlatform(ensurePlayableJumps(rawLevel));
}

// Level definitions - curated levels from Canva
const INITIAL_LEVELS = [
  {
    kingdom: 'castle',
    name: "Getting Started",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 4 },
      { x: 350, y: 400, w: 100, h: 20, type: 5 },
      { x: 500, y: 350, w: 100, h: 20, type: 0 },
      { x: 650, y: 300, w: 200, h: 40, type: 0 },
    ],
    spikes: [],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 350, y: 330, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 400, y: 320, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Jump Challenge",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 430, w: 100, h: 20, type: 4 },
      { x: 350, y: 380, w: 100, h: 20, type: 0 },
      { x: 500, y: 330, w: 100, h: 20, type: 5 },
      { x: 650, y: 280, w: 100, h: 20, type: 0 },
      { x: 800, y: 350, w: 100, h: 20, type: 4 },
      { x: 950, y: 250, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 400, y: 400, w: 40, h: 16, type: 0 },
      { x: 650, y: 350, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 360, w: 16, h: 16, collected: false },
      { x: 500, y: 260, w: 16, h: 16, collected: false },
      { x: 800, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 250, y: 420, w: 24, h: 24, vx: 2.5, minX: 200, maxX: 300, type: 'spike' }
    ],
    powerups: [
      { x: 720, y: 200, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Crumbling Path",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 2 },
      { x: 350, y: 400, w: 100, h: 20, type: 2 },
      { x: 500, y: 350, w: 100, h: 20, type: 2 },
      { x: 650, y: 300, w: 100, h: 20, type: 0 },
      { x: 800, y: 350, w: 100, h: 20, type: 2 },
      { x: 950, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 900, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
      { x: 800, y: 230, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 350, y: 320, w: 14, h: 14, collected: false, type: 'jumpboost' },
      { x: 650, y: 260, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Spike Gauntlet",
    platforms: [
      { x: 0, y: 500, w: 100, h: 20, type: 0 },
      { x: 150, y: 450, w: 100, h: 20, type: 0 },
      { x: 300, y: 400, w: 100, h: 20, type: 0 },
      { x: 450, y: 350, w: 100, h: 20, type: 0 },
      { x: 600, y: 300, w: 100, h: 20, type: 0 },
      { x: 750, y: 380, w: 100, h: 20, type: 0 },
      { x: 900, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 120, y: 520, w: 40, h: 16, type: 0 },
      { x: 270, y: 420, w: 40, h: 16, type: 0 },
      { x: 420, y: 370, w: 40, h: 16, type: 0 },
      { x: 570, y: 320, w: 40, h: 16, type: 0 },
      { x: 720, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 150, y: 380, w: 16, h: 16, collected: false },
      { x: 450, y: 280, w: 16, h: 16, collected: false },
      { x: 750, y: 310, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 300, y: 330, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Narrow Escape",
    platforms: [
      { x: 0, y: 500, w: 120, h: 20, type: 0 },
      { x: 180, y: 480, w: 80, h: 20, type: 0 },
      { x: 320, y: 460, w: 80, h: 20, type: 0 },
      { x: 460, y: 440, w: 80, h: 20, type: 0 },
      { x: 600, y: 420, w: 80, h: 20, type: 0 },
      { x: 740, y: 400, w: 80, h: 20, type: 0 },
      { x: 880, y: 380, w: 80, h: 20, type: 0 },
      { x: 1020, y: 300, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 100, y: 520, w: 80, h: 16, type: 0 },
      { x: 240, y: 500, w: 80, h: 16, type: 0 },
      { x: 380, y: 480, w: 80, h: 16, type: 0 },
      { x: 520, y: 460, w: 80, h: 16, type: 0 },
      { x: 660, y: 440, w: 80, h: 16, type: 0 },
      { x: 800, y: 420, w: 80, h: 16, type: 0 },
      { x: 940, y: 400, w: 80, h: 16, type: 0 },
    ],
    coins: [
      { x: 180, y: 410, w: 16, h: 16, collected: false },
      { x: 460, y: 370, w: 16, h: 16, collected: false },
      { x: 740, y: 330, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: []
  },
  {
    kingdom: 'castle',
    name: "Mixed Terrain",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 480, w: 100, h: 20, type: 2 },
      { x: 350, y: 420, w: 150, h: 20, type: 0 },
      { x: 550, y: 400, w: 80, h: 20, type: 2 },
      { x: 680, y: 380, w: 80, h: 20, type: 2 },
      { x: 810, y: 340, w: 150, h: 20, type: 0 },
      { x: 1000, y: 280, w: 180, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 440, w: 40, h: 16, type: 0 },
      { x: 500, y: 420, w: 40, h: 16, type: 0 },
      { x: 750, y: 400, w: 40, h: 16, type: 0 },
      { x: 950, y: 360, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 410, w: 16, h: 16, collected: false },
      { x: 350, y: 350, w: 16, h: 16, collected: false },
      { x: 550, y: 330, w: 16, h: 16, collected: false },
      { x: 810, y: 270, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 680, y: 310, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Bouncy Platforms",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 0 },
      { x: 350, y: 400, w: 100, h: 20, type: 0 },
      { x: 500, y: 350, w: 100, h: 20, type: 0 },
      { x: 650, y: 300, w: 100, h: 20, type: 0 },
      { x: 800, y: 250, w: 150, h: 20, type: 0 },
      { x: 1000, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 420, w: 40, h: 16, type: 0 },
      { x: 600, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
      { x: 800, y: 180, w: 16, h: 16, collected: false },
      { x: 1000, y: 150, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 350, y: 320, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Gravity Rush",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 420, w: 80, h: 20, type: 0 },
      { x: 320, y: 360, w: 80, h: 20, type: 0 },
      { x: 440, y: 300, w: 80, h: 20, type: 0 },
      { x: 560, y: 280, w: 100, h: 20, type: 0 },
      { x: 700, y: 320, w: 80, h: 20, type: 0 },
      { x: 820, y: 380, w: 100, h: 20, type: 2 },
      { x: 950, y: 250, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 380, y: 380, w: 40, h: 16, type: 0 },
      { x: 650, y: 320, w: 40, h: 16, type: 0 },
      { x: 900, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 350, w: 16, h: 16, collected: false },
      { x: 440, y: 230, w: 16, h: 16, collected: false },
      { x: 700, y: 250, w: 16, h: 16, collected: false },
      { x: 950, y: 180, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 200, y: 340, w: 14, h: 14, collected: false, type: 'jumpboost' },
      { x: 560, y: 210, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Platform Chain",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 170, y: 460, w: 70, h: 20, type: 0 },
      { x: 270, y: 420, w: 70, h: 20, type: 0 },
      { x: 370, y: 380, w: 70, h: 20, type: 2 },
      { x: 470, y: 340, w: 70, h: 20, type: 2 },
      { x: 570, y: 300, w: 70, h: 20, type: 0 },
      { x: 670, y: 360, w: 70, h: 20, type: 0 },
      { x: 770, y: 320, w: 70, h: 20, type: 0 },
      { x: 870, y: 280, w: 70, h: 20, type: 2 },
      { x: 1000, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 120, y: 520, w: 40, h: 16, type: 0 },
      { x: 220, y: 440, w: 40, h: 16, type: 0 },
      { x: 420, y: 400, w: 40, h: 16, type: 0 },
      { x: 620, y: 320, w: 40, h: 16, type: 0 },
      { x: 820, y: 340, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 170, y: 390, w: 16, h: 16, collected: false },
      { x: 370, y: 310, w: 16, h: 16, collected: false },
      { x: 570, y: 230, w: 16, h: 16, collected: false },
      { x: 770, y: 250, w: 16, h: 16, collected: false },
      { x: 1000, y: 150, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 470, y: 270, w: 14, h: 14, collected: false, type: 'flymode' },
      { x: 870, y: 210, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Double Jump Dash",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 440, w: 100, h: 20, type: 0 },
      { x: 350, y: 380, w: 100, h: 20, type: 0 },
      { x: 500, y: 320, w: 100, h: 20, type: 0 },
      { x: 650, y: 380, w: 100, h: 20, type: 0 },
      { x: 800, y: 440, w: 100, h: 20, type: 0 },
      { x: 950, y: 350, w: 100, h: 20, type: 0 },
      { x: 1100, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 400, w: 40, h: 16, type: 0 },
      { x: 450, y: 340, w: 40, h: 16, type: 0 },
      { x: 600, y: 400, w: 40, h: 16, type: 0 },
      { x: 750, y: 460, w: 40, h: 16, type: 0 },
      { x: 900, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 370, w: 16, h: 16, collected: false },
      { x: 500, y: 250, w: 16, h: 16, collected: false },
      { x: 800, y: 370, w: 16, h: 16, collected: false },
      { x: 950, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 400, y: 360, w: 24, h: 24, vx: 2, minX: 350, maxX: 450, type: 'spike' },
      { x: 700, y: 360, w: 24, h: 24, vx: -2, minX: 650, maxX: 750, type: 'spike' }
    ],
    powerups: [
      { x: 650, y: 310, w: 14, h: 14, collected: false, type: 'coinmultiplier' },
      { x: 1100, y: 210, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Zigzag Master",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 220, y: 450, w: 90, h: 20, type: 0 },
      { x: 380, y: 500, w: 90, h: 20, type: 0 },
      { x: 540, y: 400, w: 90, h: 20, type: 0 },
      { x: 700, y: 450, w: 90, h: 20, type: 2 },
      { x: 860, y: 350, w: 90, h: 20, type: 0 },
      { x: 1020, y: 450, w: 90, h: 20, type: 0 },
      { x: 1180, y: 300, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 330, y: 520, w: 40, h: 16, type: 0 },
      { x: 490, y: 420, w: 40, h: 16, type: 0 },
      { x: 810, y: 470, w: 40, h: 16, type: 0 },
      { x: 970, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 220, y: 380, w: 16, h: 16, collected: false },
      { x: 380, y: 430, w: 16, h: 16, collected: false },
      { x: 540, y: 330, w: 16, h: 16, collected: false },
      { x: 860, y: 280, w: 16, h: 16, collected: false },
      { x: 1020, y: 380, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 450, y: 380, w: 24, h: 24, vx: 2.5, minX: 380, maxX: 540, type: 'spike' }
    ],
    powerups: []
  },
  {
    kingdom: 'castle',
    name: "Ice Cavern",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 480, w: 100, h: 20, type: 4 },
      { x: 350, y: 450, w: 100, h: 20, type: 4 },
      { x: 500, y: 420, w: 100, h: 20, type: 4 },
      { x: 650, y: 390, w: 100, h: 20, type: 4 },
      { x: 800, y: 360, w: 100, h: 20, type: 4 },
      { x: 950, y: 300, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 500, w: 40, h: 16, type: 0 },
      { x: 450, y: 470, w: 40, h: 16, type: 0 },
      { x: 600, y: 440, w: 40, h: 16, type: 0 },
      { x: 750, y: 410, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 410, w: 16, h: 16, collected: false },
      { x: 500, y: 350, w: 16, h: 16, collected: false },
      { x: 800, y: 290, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: []
  },
  {
    kingdom: 'castle',
    name: "Slime Bounce",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 430, w: 100, h: 20, type: 5 },
      { x: 350, y: 380, w: 100, h: 20, type: 5 },
      { x: 500, y: 330, w: 100, h: 20, type: 5 },
      { x: 650, y: 300, w: 100, h: 20, type: 0 },
      { x: 800, y: 250, w: 150, h: 20, type: 0 },
      { x: 1000, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 400, w: 40, h: 16, type: 0 },
      { x: 600, y: 350, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 360, w: 16, h: 16, collected: false },
      { x: 500, y: 260, w: 16, h: 16, collected: false },
      { x: 800, y: 180, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: []
  },
  {
    kingdom: 'castle',
    name: "Sky Tower",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 430, w: 100, h: 20, type: 0 },
      { x: 300, y: 360, w: 100, h: 20, type: 0 },
      { x: 400, y: 290, w: 100, h: 20, type: 0 },
      { x: 500, y: 220, w: 100, h: 20, type: 0 },
      { x: 600, y: 320, w: 100, h: 20, type: 4 },
      { x: 700, y: 240, w: 100, h: 20, type: 0 },
      { x: 850, y: 350, w: 100, h: 20, type: 2 },
      { x: 1000, y: 150, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 250, y: 380, w: 40, h: 16, type: 0 },
      { x: 350, y: 310, w: 40, h: 16, type: 0 },
      { x: 550, y: 240, w: 40, h: 16, type: 0 },
      { x: 800, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 360, w: 16, h: 16, collected: false },
      { x: 400, y: 220, w: 16, h: 16, collected: false },
      { x: 600, y: 250, w: 16, h: 16, collected: false },
      { x: 700, y: 170, w: 16, h: 16, collected: false },
      { x: 1000, y: 100, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 350, y: 300, w: 24, h: 24, vx: 1.5, minX: 300, maxX: 400, type: 'spike' }
    ],
    powerups: [
      { x: 500, y: 140, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'castle',
    name: "Obstacle Course",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 420, w: 100, h: 20, type: 0 },
      { x: 350, y: 380, w: 100, h: 20, type: 0 },
      { x: 500, y: 340, w: 100, h: 20, type: 0 },
      { x: 650, y: 380, w: 100, h: 20, type: 0 },
      { x: 800, y: 320, w: 100, h: 20, type: 0 },
      { x: 950, y: 380, w: 100, h: 20, type: 0 },
      { x: 1100, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 400, w: 40, h: 16, type: 0 },
      { x: 450, y: 360, w: 40, h: 16, type: 0 },
      { x: 750, y: 340, w: 40, h: 16, type: 0 },
      { x: 900, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 350, w: 16, h: 16, collected: false },
      { x: 500, y: 270, w: 16, h: 16, collected: false },
      { x: 800, y: 250, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 350, y: 300, w: 24, h: 24, vx: 2, minX: 300, maxX: 400, type: 'spike' },
      { x: 650, y: 300, w: 24, h: 24, vx: -2, minX: 600, maxX: 700, type: 'spike' }
    ],
    powerups: [
      { x: 350, y: 310, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  // ICE KINGDOM - 15 levels
  {
    kingdom: 'ice',
    name: "Frozen Foundations",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 480, w: 80, h: 20, type: 0 },
      { x: 320, y: 450, w: 80, h: 20, type: 0 },
      { x: 440, y: 420, w: 80, h: 20, type: 0 },
      { x: 560, y: 380, w: 80, h: 20, type: 0 },
      { x: 680, y: 340, w: 80, h: 20, type: 0 },
      { x: 800, y: 300, w: 150, h: 20, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 270, y: 470, w: 40, h: 16, type: 0 },
      { x: 390, y: 440, w: 40, h: 16, type: 0 },
      { x: 750, y: 360, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 410, w: 16, h: 16, collected: false },
      { x: 440, y: 350, w: 16, h: 16, collected: false },
      { x: 680, y: 270, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 560, y: 310, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Icy Climbs",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 180, y: 430, w: 70, h: 20, type: 0 },
      { x: 300, y: 370, w: 70, h: 20, type: 0 },
      { x: 420, y: 300, w: 70, h: 20, type: 0 },
      { x: 540, y: 230, w: 70, h: 20, type: 0 },
      { x: 660, y: 360, w: 70, h: 20, type: 0 },
      { x: 780, y: 280, w: 70, h: 20, type: 0 },
      { x: 950, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 130, y: 520, w: 40, h: 16, type: 0 },
      { x: 250, y: 390, w: 40, h: 16, type: 0 },
      { x: 370, y: 320, w: 40, h: 16, type: 0 },
      { x: 610, y: 250, w: 40, h: 16, type: 0 },
      { x: 730, y: 380, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 180, y: 360, w: 16, h: 16, collected: false },
      { x: 420, y: 230, w: 16, h: 16, collected: false },
      { x: 660, y: 290, w: 16, h: 16, collected: false },
      { x: 950, y: 150, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 540, y: 160, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Crystal Gauntlet",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 0 },
      { x: 350, y: 400, w: 100, h: 20, type: 0 },
      { x: 500, y: 350, w: 100, h: 20, type: 0 },
      { x: 650, y: 300, w: 100, h: 20, type: 0 },
      { x: 800, y: 250, w: 100, h: 20, type: 0 },
      { x: 950, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 420, w: 40, h: 16, type: 0 },
      { x: 450, y: 370, w: 40, h: 16, type: 0 },
      { x: 600, y: 320, w: 40, h: 16, type: 0 },
      { x: 750, y: 270, w: 40, h: 16, type: 0 },
      { x: 900, y: 220, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
      { x: 800, y: 180, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 400, y: 330, w: 24, h: 24, vx: 2, minX: 350, maxX: 450, type: 'spike' }
    ],
    powerups: []
  },
  {
    kingdom: 'ice',
    name: "Slippery Slopes",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 220, y: 480, w: 90, h: 20, type: 0 },
      { x: 380, y: 450, w: 90, h: 20, type: 0 },
      { x: 540, y: 420, w: 90, h: 20, type: 0 },
      { x: 700, y: 380, w: 90, h: 20, type: 0 },
      { x: 860, y: 340, w: 90, h: 20, type: 0 },
      { x: 1020, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 330, y: 470, w: 40, h: 16, type: 0 },
      { x: 490, y: 440, w: 40, h: 16, type: 0 },
      { x: 810, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 220, y: 410, w: 16, h: 16, collected: false },
      { x: 540, y: 350, w: 16, h: 16, collected: false },
      { x: 860, y: 270, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 700, y: 310, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Frostbite Peak",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 420, w: 80, h: 20, type: 0 },
      { x: 320, y: 360, w: 80, h: 20, type: 0 },
      { x: 440, y: 300, w: 80, h: 20, type: 0 },
      { x: 560, y: 280, w: 100, h: 20, type: 0 },
      { x: 700, y: 320, w: 80, h: 20, type: 0 },
      { x: 820, y: 380, w: 100, h: 20, type: 2 },
      { x: 950, y: 250, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 380, y: 380, w: 40, h: 16, type: 0 },
      { x: 650, y: 320, w: 40, h: 16, type: 0 },
      { x: 900, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 350, w: 16, h: 16, collected: false },
      { x: 440, y: 230, w: 16, h: 16, collected: false },
      { x: 700, y: 250, w: 16, h: 16, collected: false },
      { x: 950, y: 180, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 200, y: 340, w: 14, h: 14, collected: false, type: 'coinmultiplier' },
      { x: 560, y: 210, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Snowdrift Challenge",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 170, y: 460, w: 70, h: 20, type: 0 },
      { x: 270, y: 420, w: 70, h: 20, type: 0 },
      { x: 370, y: 380, w: 70, h: 20, type: 2 },
      { x: 470, y: 340, w: 70, h: 20, type: 2 },
      { x: 570, y: 300, w: 70, h: 20, type: 0 },
      { x: 670, y: 360, w: 70, h: 20, type: 0 },
      { x: 770, y: 320, w: 70, h: 20, type: 0 },
      { x: 870, y: 280, w: 70, h: 20, type: 2 },
      { x: 1000, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 120, y: 520, w: 40, h: 16, type: 0 },
      { x: 220, y: 440, w: 40, h: 16, type: 0 },
      { x: 420, y: 400, w: 40, h: 16, type: 0 },
      { x: 620, y: 320, w: 40, h: 16, type: 0 },
      { x: 820, y: 340, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 170, y: 390, w: 16, h: 16, collected: false },
      { x: 370, y: 310, w: 16, h: 16, collected: false },
      { x: 570, y: 230, w: 16, h: 16, collected: false },
      { x: 770, y: 250, w: 16, h: 16, collected: false },
      { x: 1000, y: 150, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 470, y: 270, w: 14, h: 14, collected: false, type: 'jumpboost' },
      { x: 870, y: 210, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Blizzard Run",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 440, w: 100, h: 20, type: 0 },
      { x: 350, y: 380, w: 100, h: 20, type: 0 },
      { x: 500, y: 320, w: 100, h: 20, type: 0 },
      { x: 650, y: 380, w: 100, h: 20, type: 0 },
      { x: 800, y: 440, w: 100, h: 20, type: 0 },
      { x: 950, y: 350, w: 100, h: 20, type: 0 },
      { x: 1100, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 400, w: 40, h: 16, type: 0 },
      { x: 450, y: 340, w: 40, h: 16, type: 0 },
      { x: 600, y: 400, w: 40, h: 16, type: 0 },
      { x: 750, y: 460, w: 40, h: 16, type: 0 },
      { x: 900, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 370, w: 16, h: 16, collected: false },
      { x: 500, y: 250, w: 16, h: 16, collected: false },
      { x: 800, y: 370, w: 16, h: 16, collected: false },
      { x: 950, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 400, y: 360, w: 24, h: 24, vx: 2, minX: 350, maxX: 450, type: 'spike' },
      { x: 700, y: 360, w: 24, h: 24, vx: -2, minX: 650, maxX: 750, type: 'spike' }
    ],
    powerups: [
      { x: 650, y: 310, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Polar Passage",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 220, y: 450, w: 90, h: 20, type: 0 },
      { x: 380, y: 400, w: 90, h: 20, type: 0 },
      { x: 540, y: 350, w: 90, h: 20, type: 0 },
      { x: 700, y: 300, w: 90, h: 20, type: 2 },
      { x: 860, y: 350, w: 90, h: 20, type: 0 },
      { x: 1020, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 330, y: 420, w: 40, h: 16, type: 0 },
      { x: 490, y: 370, w: 40, h: 16, type: 0 },
      { x: 810, y: 330, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 220, y: 380, w: 16, h: 16, collected: false },
      { x: 540, y: 280, w: 16, h: 16, collected: false },
      { x: 860, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 700, y: 230, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Glacial Descent",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 430, w: 100, h: 20, type: 0 },
      { x: 300, y: 360, w: 100, h: 20, type: 0 },
      { x: 400, y: 290, w: 100, h: 20, type: 0 },
      { x: 500, y: 220, w: 100, h: 20, type: 0 },
      { x: 600, y: 320, w: 100, h: 20, type: 4 },
      { x: 700, y: 240, w: 100, h: 20, type: 0 },
      { x: 850, y: 350, w: 100, h: 20, type: 2 },
      { x: 1000, y: 150, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 250, y: 380, w: 40, h: 16, type: 0 },
      { x: 350, y: 310, w: 40, h: 16, type: 0 },
      { x: 550, y: 240, w: 40, h: 16, type: 0 },
      { x: 800, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 360, w: 16, h: 16, collected: false },
      { x: 400, y: 220, w: 16, h: 16, collected: false },
      { x: 600, y: 250, w: 16, h: 16, collected: false },
      { x: 700, y: 170, w: 16, h: 16, collected: false },
      { x: 1000, y: 100, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 350, y: 300, w: 24, h: 24, vx: 1.5, minX: 300, maxX: 400, type: 'spike' }
    ],
    powerups: [
      { x: 500, y: 140, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Frostfire Fields",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 420, w: 100, h: 20, type: 0 },
      { x: 350, y: 380, w: 100, h: 20, type: 0 },
      { x: 500, y: 340, w: 100, h: 20, type: 0 },
      { x: 650, y: 380, w: 100, h: 20, type: 0 },
      { x: 800, y: 320, w: 100, h: 20, type: 0 },
      { x: 950, y: 380, w: 100, h: 20, type: 0 },
      { x: 1100, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 400, w: 40, h: 16, type: 0 },
      { x: 450, y: 360, w: 40, h: 16, type: 0 },
      { x: 750, y: 340, w: 40, h: 16, type: 0 },
      { x: 900, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 350, w: 16, h: 16, collected: false },
      { x: 500, y: 270, w: 16, h: 16, collected: false },
      { x: 800, y: 250, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 350, y: 300, w: 24, h: 24, vx: 2, minX: 300, maxX: 400, type: 'spike' },
      { x: 650, y: 300, w: 24, h: 24, vx: -2, minX: 600, maxX: 700, type: 'spike' }
    ],
    powerups: [
      { x: 350, y: 310, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Permafrost Tower",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 0 },
      { x: 350, y: 400, w: 100, h: 20, type: 0 },
      { x: 500, y: 350, w: 100, h: 20, type: 0 },
      { x: 650, y: 300, w: 100, h: 20, type: 0 },
      { x: 800, y: 250, w: 100, h: 20, type: 0 },
      { x: 950, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 420, w: 40, h: 16, type: 0 },
      { x: 450, y: 370, w: 40, h: 16, type: 0 },
      { x: 600, y: 320, w: 40, h: 16, type: 0 },
      { x: 750, y: 270, w: 40, h: 16, type: 0 },
      { x: 900, y: 220, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
      { x: 800, y: 180, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 400, y: 330, w: 24, h: 24, vx: 2, minX: 350, maxX: 450, type: 'spike' }
    ],
    powerups: [
      { x: 650, y: 230, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Glacial Maze",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 220, y: 480, w: 90, h: 20, type: 0 },
      { x: 380, y: 500, w: 90, h: 20, type: 0 },
      { x: 540, y: 400, w: 90, h: 20, type: 0 },
      { x: 700, y: 450, w: 90, h: 20, type: 2 },
      { x: 860, y: 350, w: 90, h: 20, type: 0 },
      { x: 1020, y: 450, w: 90, h: 20, type: 0 },
      { x: 1180, y: 300, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 330, y: 520, w: 40, h: 16, type: 0 },
      { x: 490, y: 420, w: 40, h: 16, type: 0 },
      { x: 810, y: 470, w: 40, h: 16, type: 0 },
      { x: 970, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 220, y: 410, w: 16, h: 16, collected: false },
      { x: 380, y: 430, w: 16, h: 16, collected: false },
      { x: 540, y: 330, w: 16, h: 16, collected: false },
      { x: 860, y: 280, w: 16, h: 16, collected: false },
      { x: 1020, y: 380, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 450, y: 380, w: 24, h: 24, vx: 2.5, minX: 380, maxX: 540, type: 'spike' }
    ],
    powerups: [
      { x: 700, y: 380, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'ice',
    name: "Icebreaker",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 0 },
      { x: 350, y: 400, w: 100, h: 20, type: 0 },
      { x: 500, y: 350, w: 100, h: 20, type: 0 },
      { x: 650, y: 300, w: 100, h: 20, type: 0 },
      { x: 800, y: 250, w: 150, h: 20, type: 0 },
      { x: 1000, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 420, w: 40, h: 16, type: 0 },
      { x: 600, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
      { x: 800, y: 180, w: 16, h: 16, collected: false },
      { x: 1000, y: 150, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 350, y: 320, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  // SLIME KINGDOM - 15 levels
  {
    kingdom: 'slime',
    name: "Green Goo Gardens",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 0 },
      { x: 350, y: 400, w: 100, h: 20, type: 0 },
      { x: 500, y: 350, w: 100, h: 20, type: 0 },
      { x: 650, y: 300, w: 200, h: 40, type: 0 },
    ],
    spikes: [],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 350, y: 330, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 400, y: 320, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Bouncy Bog",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 430, w: 100, h: 20, type: 5 },
      { x: 350, y: 380, w: 100, h: 20, type: 5 },
      { x: 500, y: 330, w: 100, h: 20, type: 5 },
      { x: 650, y: 280, w: 100, h: 20, type: 0 },
      { x: 800, y: 350, w: 100, h: 20, type: 5 },
      { x: 950, y: 250, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 400, y: 400, w: 40, h: 16, type: 0 },
      { x: 650, y: 350, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 360, w: 16, h: 16, collected: false },
      { x: 500, y: 260, w: 16, h: 16, collected: false },
      { x: 800, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 250, y: 420, w: 24, h: 24, vx: 2.5, minX: 200, maxX: 300, type: 'spike' }
    ],
    powerups: [
      { x: 720, y: 200, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Squishy Standard",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 2 },
      { x: 350, y: 400, w: 100, h: 20, type: 2 },
      { x: 500, y: 350, w: 100, h: 20, type: 2 },
      { x: 650, y: 300, w: 100, h: 20, type: 0 },
      { x: 800, y: 350, w: 100, h: 20, type: 2 },
      { x: 950, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 900, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
      { x: 800, y: 230, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 350, y: 320, w: 14, h: 14, collected: false, type: 'jumpboost' },
      { x: 650, y: 260, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Molten Marsh",
    platforms: [
      { x: 0, y: 500, w: 100, h: 20, type: 0 },
      { x: 150, y: 450, w: 100, h: 20, type: 0 },
      { x: 300, y: 400, w: 100, h: 20, type: 0 },
      { x: 450, y: 350, w: 100, h: 20, type: 0 },
      { x: 600, y: 300, w: 100, h: 20, type: 0 },
      { x: 750, y: 380, w: 100, h: 20, type: 0 },
      { x: 900, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 120, y: 520, w: 40, h: 16, type: 0 },
      { x: 270, y: 420, w: 40, h: 16, type: 0 },
      { x: 420, y: 370, w: 40, h: 16, type: 0 },
      { x: 570, y: 320, w: 40, h: 16, type: 0 },
      { x: 720, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 150, y: 380, w: 16, h: 16, collected: false },
      { x: 450, y: 280, w: 16, h: 16, collected: false },
      { x: 750, y: 310, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 300, y: 330, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Viscous Valley",
    platforms: [
      { x: 0, y: 500, w: 120, h: 20, type: 0 },
      { x: 180, y: 480, w: 80, h: 20, type: 0 },
      { x: 320, y: 460, w: 80, h: 20, type: 0 },
      { x: 460, y: 440, w: 80, h: 20, type: 0 },
      { x: 600, y: 420, w: 80, h: 20, type: 0 },
      { x: 740, y: 400, w: 80, h: 20, type: 0 },
      { x: 880, y: 380, w: 80, h: 20, type: 0 },
      { x: 1020, y: 300, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 100, y: 520, w: 80, h: 16, type: 0 },
      { x: 240, y: 500, w: 80, h: 16, type: 0 },
      { x: 380, y: 480, w: 80, h: 16, type: 0 },
      { x: 520, y: 460, w: 80, h: 16, type: 0 },
      { x: 660, y: 440, w: 80, h: 16, type: 0 },
      { x: 800, y: 420, w: 80, h: 16, type: 0 },
      { x: 940, y: 400, w: 80, h: 16, type: 0 },
    ],
    coins: [
      { x: 180, y: 410, w: 16, h: 16, collected: false },
      { x: 460, y: 370, w: 16, h: 16, collected: false },
      { x: 740, y: 330, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: []
  },
  {
    kingdom: 'slime',
    name: "Gooey Gauntlet",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 480, w: 100, h: 20, type: 2 },
      { x: 350, y: 420, w: 150, h: 20, type: 0 },
      { x: 550, y: 400, w: 80, h: 20, type: 2 },
      { x: 680, y: 380, w: 80, h: 20, type: 2 },
      { x: 810, y: 340, w: 150, h: 20, type: 0 },
      { x: 1000, y: 280, w: 180, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 440, w: 40, h: 16, type: 0 },
      { x: 500, y: 420, w: 40, h: 16, type: 0 },
      { x: 750, y: 400, w: 40, h: 16, type: 0 },
      { x: 950, y: 360, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 410, w: 16, h: 16, collected: false },
      { x: 350, y: 350, w: 16, h: 16, collected: false },
      { x: 550, y: 330, w: 16, h: 16, collected: false },
      { x: 810, y: 270, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 680, y: 310, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Sticky Slopes",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 450, w: 100, h: 20, type: 0 },
      { x: 350, y: 400, w: 100, h: 20, type: 0 },
      { x: 500, y: 350, w: 100, h: 20, type: 0 },
      { x: 650, y: 300, w: 100, h: 20, type: 0 },
      { x: 800, y: 250, w: 150, h: 20, type: 0 },
      { x: 1000, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 420, w: 40, h: 16, type: 0 },
      { x: 600, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 380, w: 16, h: 16, collected: false },
      { x: 500, y: 280, w: 16, h: 16, collected: false },
      { x: 800, y: 180, w: 16, h: 16, collected: false },
      { x: 1000, y: 150, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 350, y: 320, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Gelatinous Giant",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 420, w: 80, h: 20, type: 0 },
      { x: 320, y: 360, w: 80, h: 20, type: 0 },
      { x: 440, y: 300, w: 80, h: 20, type: 0 },
      { x: 560, y: 280, w: 100, h: 20, type: 0 },
      { x: 700, y: 320, w: 80, h: 20, type: 0 },
      { x: 820, y: 380, w: 100, h: 20, type: 2 },
      { x: 950, y: 250, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 380, y: 380, w: 40, h: 16, type: 0 },
      { x: 650, y: 320, w: 40, h: 16, type: 0 },
      { x: 900, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 350, w: 16, h: 16, collected: false },
      { x: 440, y: 230, w: 16, h: 16, collected: false },
      { x: 700, y: 250, w: 16, h: 16, collected: false },
      { x: 950, y: 180, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 200, y: 340, w: 14, h: 14, collected: false, type: 'coinmultiplier' },
      { x: 560, y: 210, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Slime Slide",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 170, y: 460, w: 70, h: 20, type: 0 },
      { x: 270, y: 420, w: 70, h: 20, type: 0 },
      { x: 370, y: 380, w: 70, h: 20, type: 2 },
      { x: 470, y: 340, w: 70, h: 20, type: 2 },
      { x: 570, y: 300, w: 70, h: 20, type: 0 },
      { x: 670, y: 360, w: 70, h: 20, type: 0 },
      { x: 770, y: 320, w: 70, h: 20, type: 0 },
      { x: 870, y: 280, w: 70, h: 20, type: 2 },
      { x: 1000, y: 200, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 120, y: 520, w: 40, h: 16, type: 0 },
      { x: 220, y: 440, w: 40, h: 16, type: 0 },
      { x: 420, y: 400, w: 40, h: 16, type: 0 },
      { x: 620, y: 320, w: 40, h: 16, type: 0 },
      { x: 820, y: 340, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 170, y: 390, w: 16, h: 16, collected: false },
      { x: 370, y: 310, w: 16, h: 16, collected: false },
      { x: 570, y: 230, w: 16, h: 16, collected: false },
      { x: 770, y: 250, w: 16, h: 16, collected: false },
      { x: 1000, y: 150, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 470, y: 270, w: 14, h: 14, collected: false, type: 'jumpboost' },
      { x: 870, y: 210, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Amphibious Ascent",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 440, w: 100, h: 20, type: 0 },
      { x: 350, y: 380, w: 100, h: 20, type: 0 },
      { x: 500, y: 320, w: 100, h: 20, type: 0 },
      { x: 650, y: 380, w: 100, h: 20, type: 0 },
      { x: 800, y: 440, w: 100, h: 20, type: 0 },
      { x: 950, y: 350, w: 100, h: 20, type: 0 },
      { x: 1100, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 400, w: 40, h: 16, type: 0 },
      { x: 450, y: 340, w: 40, h: 16, type: 0 },
      { x: 600, y: 400, w: 40, h: 16, type: 0 },
      { x: 750, y: 460, w: 40, h: 16, type: 0 },
      { x: 900, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 370, w: 16, h: 16, collected: false },
      { x: 500, y: 250, w: 16, h: 16, collected: false },
      { x: 800, y: 370, w: 16, h: 16, collected: false },
      { x: 950, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 400, y: 360, w: 24, h: 24, vx: 2, minX: 350, maxX: 450, type: 'spike' },
      { x: 700, y: 360, w: 24, h: 24, vx: -2, minX: 650, maxX: 750, type: 'spike' }
    ],
    powerups: [
      { x: 650, y: 310, w: 14, h: 14, collected: false, type: 'coinmultiplier' },
      { x: 1100, y: 210, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Swamp Serpent",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 220, y: 450, w: 90, h: 20, type: 0 },
      { x: 380, y: 400, w: 90, h: 20, type: 0 },
      { x: 540, y: 350, w: 90, h: 20, type: 0 },
      { x: 700, y: 300, w: 90, h: 20, type: 2 },
      { x: 860, y: 350, w: 90, h: 20, type: 0 },
      { x: 1020, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 330, y: 420, w: 40, h: 16, type: 0 },
      { x: 490, y: 370, w: 40, h: 16, type: 0 },
      { x: 810, y: 330, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 220, y: 380, w: 16, h: 16, collected: false },
      { x: 540, y: 280, w: 16, h: 16, collected: false },
      { x: 860, y: 280, w: 16, h: 16, collected: false },
    ],
    obstacles: [],
    powerups: [
      { x: 700, y: 230, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Putrid Palace",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 430, w: 100, h: 20, type: 0 },
      { x: 300, y: 360, w: 100, h: 20, type: 0 },
      { x: 400, y: 290, w: 100, h: 20, type: 0 },
      { x: 500, y: 220, w: 100, h: 20, type: 0 },
      { x: 600, y: 320, w: 100, h: 20, type: 4 },
      { x: 700, y: 240, w: 100, h: 20, type: 0 },
      { x: 850, y: 350, w: 100, h: 20, type: 2 },
      { x: 1000, y: 150, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 250, y: 380, w: 40, h: 16, type: 0 },
      { x: 350, y: 310, w: 40, h: 16, type: 0 },
      { x: 550, y: 240, w: 40, h: 16, type: 0 },
      { x: 800, y: 370, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 360, w: 16, h: 16, collected: false },
      { x: 400, y: 220, w: 16, h: 16, collected: false },
      { x: 600, y: 250, w: 16, h: 16, collected: false },
      { x: 700, y: 170, w: 16, h: 16, collected: false },
      { x: 1000, y: 100, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 350, y: 300, w: 24, h: 24, vx: 1.5, minX: 300, maxX: 400, type: 'spike' }
    ],
    powerups: [
      { x: 500, y: 140, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'slime',
    name: "Ooze Obstacle",
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 200, y: 420, w: 100, h: 20, type: 0 },
      { x: 350, y: 380, w: 100, h: 20, type: 0 },
      { x: 500, y: 340, w: 100, h: 20, type: 0 },
      { x: 650, y: 380, w: 100, h: 20, type: 0 },
      { x: 800, y: 320, w: 100, h: 20, type: 0 },
      { x: 950, y: 380, w: 100, h: 20, type: 0 },
      { x: 1100, y: 280, w: 200, h: 40, type: 0 },
    ],
    spikes: [
      { x: 150, y: 520, w: 40, h: 16, type: 0 },
      { x: 300, y: 400, w: 40, h: 16, type: 0 },
      { x: 450, y: 360, w: 40, h: 16, type: 0 },
      { x: 750, y: 340, w: 40, h: 16, type: 0 },
      { x: 900, y: 400, w: 40, h: 16, type: 0 },
    ],
    coins: [
      { x: 200, y: 350, w: 16, h: 16, collected: false },
      { x: 500, y: 270, w: 16, h: 16, collected: false },
      { x: 800, y: 250, w: 16, h: 16, collected: false },
    ],
    obstacles: [
      { x: 350, y: 300, w: 24, h: 24, vx: 2, minX: 300, maxX: 400, type: 'spike' },
      { x: 650, y: 300, w: 24, h: 24, vx: -2, minX: 600, maxX: 700, type: 'spike' }
    ],
    powerups: [
      { x: 350, y: 310, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Ember Threshold',
    platforms: [
      { x: 0, y: 500, w: 170, h: 20, type: 0 },
      { x: 220, y: 450, w: 110, h: 20, type: 0 },
      { x: 380, y: 430, w: 100, h: 20, type: 6 },
      { x: 530, y: 380, w: 120, h: 20, type: 0 },
      { x: 700, y: 350, w: 110, h: 20, type: 6 },
      { x: 860, y: 310, w: 120, h: 20, type: 0 },
      { x: 1030, y: 260, w: 120, h: 20, type: 0 },
      { x: 1180, y: 210, w: 220, h: 40, type: 0 }
    ],
    spikes: [
      { x: 170, y: 520, w: 40, h: 16, type: 0 },
      { x: 480, y: 450, w: 40, h: 16, type: 0 },
      { x: 810, y: 370, w: 40, h: 16, type: 0 },
      { x: 1150, y: 280, w: 40, h: 16, type: 0 }
    ],
    coins: [
      { x: 230, y: 390, w: 16, h: 16, collected: false },
      { x: 550, y: 320, w: 16, h: 16, collected: false },
      { x: 870, y: 250, w: 16, h: 16, collected: false },
      { x: 1220, y: 160, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 600, y: 310, w: 24, h: 24, vx: 1.8, minX: 560, maxX: 690, type: 'spike' }
    ],
    powerups: [
      { x: 1050, y: 210, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Obsidian Lung',
    platforms: [
      { x: 0, y: 500, w: 140, h: 20, type: 0 },
      { x: 190, y: 470, w: 100, h: 20, type: 6 },
      { x: 340, y: 430, w: 110, h: 20, type: 0 },
      { x: 510, y: 390, w: 100, h: 20, type: 6 },
      { x: 660, y: 360, w: 120, h: 20, type: 0 },
      { x: 830, y: 330, w: 120, h: 20, type: 2 },
      { x: 1000, y: 280, w: 110, h: 20, type: 6 },
      { x: 1160, y: 230, w: 210, h: 40, type: 0 }
    ],
    spikes: [
      { x: 150, y: 520, w: 30, h: 16, type: 0 },
      { x: 300, y: 450, w: 30, h: 16, type: 0 },
      { x: 620, y: 410, w: 30, h: 16, type: 0 },
      { x: 950, y: 350, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 200, y: 410, w: 16, h: 16, collected: false },
      { x: 520, y: 330, w: 16, h: 16, collected: false },
      { x: 845, y: 270, w: 16, h: 16, collected: false },
      { x: 1175, y: 180, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 720, y: 300, w: 24, h: 24, vx: -2.1, minX: 670, maxX: 810, type: 'spike' }
    ],
    powerups: [
      { x: 670, y: 320, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Vent Gauntlet',
    platforms: [
      { x: 0, y: 500, w: 140, h: 20, type: 0 },
      { x: 190, y: 470, w: 90, h: 20, type: 6 },
      { x: 330, y: 430, w: 90, h: 20, type: 6 },
      { x: 470, y: 390, w: 90, h: 20, type: 0 },
      { x: 620, y: 350, w: 90, h: 20, type: 6 },
      { x: 760, y: 320, w: 100, h: 20, type: 0 },
      { x: 920, y: 290, w: 100, h: 20, type: 6 },
      { x: 1070, y: 250, w: 120, h: 20, type: 0 },
      { x: 1230, y: 200, w: 220, h: 40, type: 0 }
    ],
    spikes: [
      { x: 145, y: 520, w: 30, h: 16, type: 0 },
      { x: 285, y: 490, w: 30, h: 16, type: 0 },
      { x: 425, y: 450, w: 30, h: 16, type: 0 },
      { x: 875, y: 340, w: 30, h: 16, type: 0 },
      { x: 1195, y: 270, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 345, y: 370, w: 16, h: 16, collected: false },
      { x: 635, y: 290, w: 16, h: 16, collected: false },
      { x: 930, y: 230, w: 16, h: 16, collected: false },
      { x: 1255, y: 150, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 540, y: 330, w: 24, h: 24, vx: 2.2, minX: 500, maxX: 610, type: 'spike' },
      { x: 1040, y: 210, w: 24, h: 24, vx: -2.2, minX: 990, maxX: 1120, type: 'spike' }
    ],
    powerups: [
      { x: 770, y: 280, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Peak Breach',
    platforms: [
      { x: 0, y: 500, w: 160, h: 20, type: 0 },
      { x: 220, y: 440, w: 110, h: 20, type: 0 },
      { x: 390, y: 390, w: 100, h: 20, type: 6 },
      { x: 540, y: 350, w: 100, h: 20, type: 0 },
      { x: 700, y: 300, w: 100, h: 20, type: 6 },
      { x: 860, y: 260, w: 100, h: 20, type: 0 },
      { x: 1020, y: 220, w: 120, h: 20, type: 2 },
      { x: 1200, y: 170, w: 240, h: 40, type: 0 }
    ],
    spikes: [
      { x: 175, y: 520, w: 40, h: 16, type: 0 },
      { x: 500, y: 410, w: 30, h: 16, type: 0 },
      { x: 820, y: 320, w: 30, h: 16, type: 0 },
      { x: 1160, y: 240, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 235, y: 380, w: 16, h: 16, collected: false },
      { x: 555, y: 290, w: 16, h: 16, collected: false },
      { x: 875, y: 200, w: 16, h: 16, collected: false },
      { x: 1230, y: 120, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 320, y: 360, w: 24, h: 24, vx: 2.0, minX: 260, maxX: 380, type: 'spike' },
      { x: 950, y: 190, w: 24, h: 24, vx: -2.0, minX: 900, maxX: 1040, type: 'spike' }
    ],
    powerups: [
      { x: 710, y: 250, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Ash Stair',
    platforms: [
      { x: 0, y: 500, w: 170, h: 20, type: 0 },
      { x: 210, y: 455, w: 100, h: 20, type: 2 },
      { x: 360, y: 415, w: 100, h: 20, type: 0 },
      { x: 510, y: 375, w: 100, h: 20, type: 6 },
      { x: 660, y: 335, w: 100, h: 20, type: 0 },
      { x: 820, y: 300, w: 100, h: 20, type: 2 },
      { x: 980, y: 250, w: 240, h: 40, type: 0 }
    ],
    spikes: [
      { x: 180, y: 520, w: 30, h: 16, type: 0 },
      { x: 485, y: 395, w: 30, h: 16, type: 0 },
      { x: 790, y: 320, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 220, y: 395, w: 16, h: 16, collected: false },
      { x: 520, y: 315, w: 16, h: 16, collected: false },
      { x: 830, y: 240, w: 16, h: 16, collected: false },
      { x: 1010, y: 200, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 560, y: 345, w: 24, h: 24, vx: 2.1, minX: 520, maxX: 620, type: 'spike' }
    ],
    powerups: [
      { x: 680, y: 295, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Cinder Steps',
    platforms: [
      { x: 0, y: 500, w: 160, h: 20, type: 0 },
      { x: 200, y: 470, w: 90, h: 20, type: 6 },
      { x: 340, y: 430, w: 90, h: 20, type: 0 },
      { x: 480, y: 400, w: 90, h: 20, type: 2 },
      { x: 620, y: 360, w: 100, h: 20, type: 6 },
      { x: 780, y: 325, w: 100, h: 20, type: 0 },
      { x: 930, y: 285, w: 120, h: 20, type: 0 },
      { x: 1090, y: 235, w: 230, h: 40, type: 0 }
    ],
    spikes: [
      { x: 170, y: 520, w: 30, h: 16, type: 0 },
      { x: 450, y: 420, w: 30, h: 16, type: 0 },
      { x: 740, y: 345, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 210, y: 410, w: 16, h: 16, collected: false },
      { x: 490, y: 340, w: 16, h: 16, collected: false },
      { x: 790, y: 265, w: 16, h: 16, collected: false },
      { x: 1110, y: 180, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 690, y: 330, w: 24, h: 24, vx: -2.0, minX: 640, maxX: 760, type: 'spike' }
    ],
    powerups: [
      { x: 940, y: 245, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Ventline Drift',
    platforms: [
      { x: 0, y: 500, w: 155, h: 20, type: 0 },
      { x: 200, y: 460, w: 100, h: 20, type: 6 },
      { x: 350, y: 430, w: 90, h: 20, type: 6 },
      { x: 500, y: 395, w: 100, h: 20, type: 0 },
      { x: 650, y: 360, w: 100, h: 20, type: 6 },
      { x: 810, y: 325, w: 100, h: 20, type: 2 },
      { x: 970, y: 290, w: 120, h: 20, type: 6 },
      { x: 1130, y: 240, w: 230, h: 40, type: 0 }
    ],
    spikes: [
      { x: 165, y: 520, w: 30, h: 16, type: 0 },
      { x: 470, y: 415, w: 30, h: 16, type: 0 },
      { x: 940, y: 310, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 210, y: 400, w: 16, h: 16, collected: false },
      { x: 510, y: 335, w: 16, h: 16, collected: false },
      { x: 820, y: 265, w: 16, h: 16, collected: false },
      { x: 1155, y: 190, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 560, y: 345, w: 24, h: 24, vx: 2.3, minX: 520, maxX: 620, type: 'spike' }
    ],
    powerups: [
      { x: 665, y: 318, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Basalt Bridges',
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 210, y: 455, w: 110, h: 20, type: 0 },
      { x: 380, y: 420, w: 110, h: 20, type: 2 },
      { x: 540, y: 380, w: 100, h: 20, type: 6 },
      { x: 690, y: 340, w: 110, h: 20, type: 0 },
      { x: 860, y: 305, w: 110, h: 20, type: 2 },
      { x: 1030, y: 260, w: 240, h: 40, type: 0 }
    ],
    spikes: [
      { x: 160, y: 520, w: 35, h: 16, type: 0 },
      { x: 510, y: 400, w: 30, h: 16, type: 0 },
      { x: 830, y: 325, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 230, y: 395, w: 16, h: 16, collected: false },
      { x: 555, y: 320, w: 16, h: 16, collected: false },
      { x: 875, y: 245, w: 16, h: 16, collected: false },
      { x: 1060, y: 210, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 720, y: 320, w: 24, h: 24, vx: -2.0, minX: 690, maxX: 790, type: 'spike' }
    ],
    powerups: [
      { x: 705, y: 300, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Furnace Teeth',
    platforms: [
      { x: 0, y: 500, w: 155, h: 20, type: 0 },
      { x: 205, y: 470, w: 95, h: 20, type: 6 },
      { x: 350, y: 440, w: 95, h: 20, type: 0 },
      { x: 500, y: 400, w: 95, h: 20, type: 6 },
      { x: 650, y: 365, w: 95, h: 20, type: 0 },
      { x: 800, y: 330, w: 95, h: 20, type: 6 },
      { x: 960, y: 290, w: 100, h: 20, type: 2 },
      { x: 1120, y: 235, w: 240, h: 40, type: 0 }
    ],
    spikes: [
      { x: 170, y: 520, w: 30, h: 16, type: 0 },
      { x: 470, y: 420, w: 30, h: 16, type: 0 },
      { x: 930, y: 310, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 215, y: 410, w: 16, h: 16, collected: false },
      { x: 510, y: 335, w: 16, h: 16, collected: false },
      { x: 810, y: 265, w: 16, h: 16, collected: false },
      { x: 1140, y: 185, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 580, y: 340, w: 24, h: 24, vx: 2.4, minX: 530, maxX: 640, type: 'spike' },
      { x: 1020, y: 260, w: 24, h: 24, vx: -2.2, minX: 970, maxX: 1080, type: 'spike' }
    ],
    powerups: [
      { x: 965, y: 250, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Obsidian Switchback',
    platforms: [
      { x: 0, y: 500, w: 160, h: 20, type: 0 },
      { x: 220, y: 455, w: 110, h: 20, type: 0 },
      { x: 380, y: 410, w: 110, h: 20, type: 6 },
      { x: 550, y: 445, w: 100, h: 20, type: 2 },
      { x: 710, y: 370, w: 110, h: 20, type: 6 },
      { x: 880, y: 325, w: 110, h: 20, type: 0 },
      { x: 1050, y: 275, w: 250, h: 40, type: 0 }
    ],
    spikes: [
      { x: 170, y: 520, w: 30, h: 16, type: 0 },
      { x: 520, y: 465, w: 30, h: 16, type: 0 },
      { x: 850, y: 345, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 235, y: 395, w: 16, h: 16, collected: false },
      { x: 560, y: 385, w: 16, h: 16, collected: false },
      { x: 890, y: 265, w: 16, h: 16, collected: false },
      { x: 1080, y: 225, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 760, y: 345, w: 24, h: 24, vx: -2.1, minX: 720, maxX: 830, type: 'spike' }
    ],
    powerups: [
      { x: 390, y: 360, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Ashfall Corridor',
    platforms: [
      { x: 0, y: 500, w: 170, h: 20, type: 0 },
      { x: 230, y: 460, w: 100, h: 20, type: 2 },
      { x: 390, y: 430, w: 100, h: 20, type: 0 },
      { x: 550, y: 395, w: 100, h: 20, type: 6 },
      { x: 710, y: 360, w: 100, h: 20, type: 2 },
      { x: 870, y: 325, w: 100, h: 20, type: 6 },
      { x: 1030, y: 285, w: 250, h: 40, type: 0 }
    ],
    spikes: [
      { x: 190, y: 520, w: 30, h: 16, type: 0 },
      { x: 520, y: 415, w: 30, h: 16, type: 0 },
      { x: 840, y: 345, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 240, y: 400, w: 16, h: 16, collected: false },
      { x: 560, y: 335, w: 16, h: 16, collected: false },
      { x: 880, y: 265, w: 16, h: 16, collected: false },
      { x: 1050, y: 235, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 760, y: 330, w: 24, h: 24, vx: 2.0, minX: 720, maxX: 820, type: 'spike' }
    ],
    powerups: [
      { x: 720, y: 310, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Sulfur Climb',
    platforms: [
      { x: 0, y: 500, w: 150, h: 20, type: 0 },
      { x: 210, y: 470, w: 95, h: 20, type: 6 },
      { x: 360, y: 430, w: 100, h: 20, type: 0 },
      { x: 520, y: 395, w: 100, h: 20, type: 6 },
      { x: 680, y: 355, w: 100, h: 20, type: 0 },
      { x: 840, y: 320, w: 110, h: 20, type: 2 },
      { x: 1010, y: 270, w: 120, h: 20, type: 6 },
      { x: 1170, y: 220, w: 250, h: 40, type: 0 }
    ],
    spikes: [
      { x: 160, y: 520, w: 30, h: 16, type: 0 },
      { x: 490, y: 415, w: 30, h: 16, type: 0 },
      { x: 980, y: 290, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 220, y: 410, w: 16, h: 16, collected: false },
      { x: 530, y: 335, w: 16, h: 16, collected: false },
      { x: 850, y: 260, w: 16, h: 16, collected: false },
      { x: 1200, y: 170, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 705, y: 335, w: 24, h: 24, vx: -2.2, minX: 670, maxX: 770, type: 'spike' }
    ],
    powerups: [
      { x: 1020, y: 230, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Core Traverse',
    platforms: [
      { x: 0, y: 500, w: 160, h: 20, type: 0 },
      { x: 220, y: 460, w: 100, h: 20, type: 6 },
      { x: 380, y: 420, w: 100, h: 20, type: 2 },
      { x: 540, y: 385, w: 100, h: 20, type: 0 },
      { x: 700, y: 350, w: 100, h: 20, type: 6 },
      { x: 860, y: 315, w: 110, h: 20, type: 0 },
      { x: 1030, y: 270, w: 110, h: 20, type: 2 },
      { x: 1210, y: 215, w: 250, h: 40, type: 0 }
    ],
    spikes: [
      { x: 175, y: 520, w: 30, h: 16, type: 0 },
      { x: 510, y: 405, w: 30, h: 16, type: 0 },
      { x: 1000, y: 290, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 230, y: 400, w: 16, h: 16, collected: false },
      { x: 550, y: 325, w: 16, h: 16, collected: false },
      { x: 870, y: 255, w: 16, h: 16, collected: false },
      { x: 1240, y: 165, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 735, y: 330, w: 24, h: 24, vx: 2.0, minX: 690, maxX: 800, type: 'spike' },
      { x: 1120, y: 245, w: 24, h: 24, vx: -2.0, minX: 1060, maxX: 1190, type: 'spike' }
    ],
    powerups: [
      { x: 390, y: 370, w: 14, h: 14, collected: false, type: 'flymode' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Magma Marathon',
    platforms: [
      { x: 0, y: 500, w: 170, h: 20, type: 0 },
      { x: 230, y: 465, w: 100, h: 20, type: 0 },
      { x: 390, y: 430, w: 100, h: 20, type: 6 },
      { x: 550, y: 390, w: 100, h: 20, type: 2 },
      { x: 710, y: 355, w: 110, h: 20, type: 6 },
      { x: 880, y: 320, w: 110, h: 20, type: 0 },
      { x: 1050, y: 285, w: 110, h: 20, type: 6 },
      { x: 1220, y: 245, w: 120, h: 20, type: 2 },
      { x: 1410, y: 190, w: 260, h: 40, type: 0 }
    ],
    spikes: [
      { x: 180, y: 520, w: 30, h: 16, type: 0 },
      { x: 520, y: 410, w: 30, h: 16, type: 0 },
      { x: 1015, y: 305, w: 30, h: 16, type: 0 },
      { x: 1380, y: 210, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 240, y: 405, w: 16, h: 16, collected: false },
      { x: 560, y: 335, w: 16, h: 16, collected: false },
      { x: 890, y: 260, w: 16, h: 16, collected: false },
      { x: 1235, y: 190, w: 16, h: 16, collected: false },
      { x: 1440, y: 140, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 760, y: 330, w: 24, h: 24, vx: -2.1, minX: 720, maxX: 830, type: 'spike' },
      { x: 1290, y: 220, w: 24, h: 24, vx: 2.2, minX: 1240, maxX: 1360, type: 'spike' }
    ],
    powerups: [
      { x: 1060, y: 245, w: 14, h: 14, collected: false, type: 'coinmultiplier' }
    ]
  },
  {
    kingdom: 'magma',
    name: 'Obsidian Crown',
    platforms: [
      { x: 0, y: 500, w: 160, h: 20, type: 0 },
      { x: 220, y: 470, w: 100, h: 20, type: 6 },
      { x: 370, y: 435, w: 100, h: 20, type: 0 },
      { x: 530, y: 400, w: 100, h: 20, type: 2 },
      { x: 690, y: 360, w: 100, h: 20, type: 6 },
      { x: 850, y: 325, w: 100, h: 20, type: 2 },
      { x: 1010, y: 285, w: 110, h: 20, type: 6 },
      { x: 1180, y: 235, w: 270, h: 40, type: 0 }
    ],
    spikes: [
      { x: 170, y: 520, w: 30, h: 16, type: 0 },
      { x: 500, y: 420, w: 30, h: 16, type: 0 },
      { x: 980, y: 305, w: 30, h: 16, type: 0 }
    ],
    coins: [
      { x: 230, y: 410, w: 16, h: 16, collected: false },
      { x: 540, y: 340, w: 16, h: 16, collected: false },
      { x: 860, y: 265, w: 16, h: 16, collected: false },
      { x: 1210, y: 175, w: 16, h: 16, collected: false }
    ],
    obstacles: [
      { x: 735, y: 340, w: 24, h: 24, vx: 2.2, minX: 700, maxX: 800, type: 'spike' }
    ],
    powerups: [
      { x: 1020, y: 245, w: 14, h: 14, collected: false, type: 'jumpboost' }
    ]
  }
];

function buildSkyLevels() {
  const skyNames = [
    'Cloudstep Start',
    'Morning Lift',
    'Featherline',
    'Rose Horizon',
    'Sunwake Rungs',
    'High Drift',
    'Dawn Rails',
    'Pastel Updraft',
    'Skyline Pulse',
    'Cirrus Ladder',
    'Halo Transit',
    'Silver Wake',
    'Zenith Liftway',
    'Above the Amber',
    'Seven Thousand Feet'
  ];

  const levels = [];
  const laneX = [220, 370, 520, 670, 820];

  for (let i = 0; i < skyNames.length; i++) {
    const platforms = [{ x: 0, y: 500, w: 170, h: 20, type: 0 }];
    const coins = [];
    const spikes = [];
    const obstacles = [];
    const powerups = [];

    const baseY = 500;
    const heightOffset = Math.floor(i * 0.8);  // Reduced from 2.1 to prevent impossible jumps
    let lane = 1 + (i % 2);
    let prevPlatform = { x: 0, y: 500, w: 170 };

    for (let step = 1; step <= 8; step++) {
      const y = baseY - step * 66 - heightOffset;

      const laneDelta = ((step + i) % 4 === 0) ? 1 : (((step + i) % 5 === 0) ? -1 : 0);
      lane = Math.max(0, Math.min(laneX.length - 1, lane + laneDelta));

      let x = laneX[lane] + ((i % 3) - 1) * 8;
      x = Math.max(prevPlatform.x - 130, Math.min(prevPlatform.x + 140, x));

      const isElevator = step === 3 || (step === 6 && i >= 5);
      const isCrumble = step === 5 || (step === 7 && i >= 10);
      const type = isElevator ? 7 : (isCrumble ? 2 : 0);
      const width = isElevator ? 106 : 122;

      const platform = { x, y, w: width, h: 20, type };
      if (type === 7) {
        const amp = i >= 10 ? 30 : 24;
        platform.minY = y - amp;
        platform.maxY = y + amp;
        platform.speed = 0.55 + (i % 4) * 0.1;
        platform.moveDir = ((i + step) % 2 === 0) ? 1 : -1;
      }
      platforms.push(platform);

      coins.push({ x: x + Math.floor(width / 2) - 8, y: y - 34, w: 16, h: 16, collected: false });

      // Put spikes beside the route rather than directly on intended landing paths.
      if (step % 3 === 0) {
        const sideX = x + width + 16;
        spikes.push({ x: sideX, y: y + 20, w: 26, h: 16, type: 0 });
      }

      prevPlatform = platform;
    }

    const finishY = Math.max(40, prevPlatform.y - 82);
    const finishX = Math.max(prevPlatform.x - 30, Math.min(prevPlatform.x + 40, prevPlatform.x + ((i % 2 === 0) ? 25 : -20)));
    platforms.push({ x: finishX, y: finishY, w: 240, h: 40, type: 0 });

    if (i >= 6) {
      obstacles.push({
        x: prevPlatform.x - 55,
        y: prevPlatform.y - 55,
        w: 24,
        h: 24,
        vx: (i % 2 === 0 ? 1 : -1) * 1.6,
        minX: prevPlatform.x - 80,
        maxX: prevPlatform.x + 30,
        type: 'spike'
      });
    }

    if (i % 5 === 1) {
      powerups.push({ x: laneX[2], y: 270 - Math.floor(i * 2), w: 14, h: 14, collected: false, type: 'jumpboost' });
    } else if (i % 5 === 3) {
      powerups.push({ x: laneX[3], y: 250 - Math.floor(i * 2), w: 14, h: 14, collected: false, type: 'coinmultiplier' });
    }

    levels.push({
      kingdom: 'sky',
      name: skyNames[i],
      platforms,
      spikes,
      coins,
      obstacles,
      powerups
    });
  }

  return levels;
}

INITIAL_LEVELS.push(...buildSkyLevels());

// Procedural generation and autopopulation removed: we run exactly the curated INITIAL_LEVELS now.

// Particle system
let particles = [];
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    // Cap particle array to prevent memory leaks
    if (particles.length >= 500) {
      particles.shift();
    }
    particles.push({
      x, y,
      vx: (particleRng.next() - 0.5) * 6,
      vy: (particleRng.next() - 1) * 5,
      life: 30 + particleRng.next() * 20,
      maxLife: 50,
      size: 2 + particleRng.next() * 3,
      color
    });
  }
}

// All 28 cube skins
const CUBE_SKINS = {
  classic: {
    name: 'Classic',
    price: 0,
    bodyColor: '#3b82f6',
    bodyStroke: '#1e40af',
    faceColor: '#fbbf24',
    faceStroke: '#b45309',
    description: 'The original blue cube'
  },
  red: {
    name: 'Ruby',
    price: 30,
    bodyColor: '#ef4444',
    bodyStroke: '#991b1b',
    faceColor: '#fecaca',
    faceStroke: '#7f1d1d',
    description: 'A fiery red cube'
  },
  purple: {
    name: 'Amethyst',
    price: 50,
    bodyColor: '#a855f7',
    bodyStroke: '#6b21a8',
    faceColor: '#e9d5ff',
    faceStroke: '#7e22ce',
    description: 'Mystical purple cube'
  },
  green: {
    name: 'Emerald',
    price: 40,
    bodyColor: '#10b981',
    bodyStroke: '#065f46',
    faceColor: '#d1fae5',
    faceStroke: '#047857',
    description: 'Nature\'s green cube'
  },
  ice: {
    name: 'Frost',
    price: 50,
    bodyColor: '#06b6d4',
    bodyStroke: '#0e7490',
    faceColor: '#cffafe',
    faceStroke: '#164e63',
    description: 'Frozen ice cube'
  },
  astronaut: {
    name: 'Astronaut',
    price: 100,
    bodyColor: '#3b82f6',
    bodyStroke: '#1e40af',
    faceColor: '#000',
    faceStroke: '#666',
    description: 'Space explorer mode',
    isAstronaut: true
  },
  gold: {
    name: 'Treasure',
    price: 80,
    bodyColor: '#fbbf24',
    bodyStroke: '#92400e',
    faceColor: '#fef3c7',
    faceStroke: '#b45309',
    description: 'Worth its weight in coins'
  },
  candy: {
    name: 'Candy',
    price: 60,
    bodyColor: '#ec4899',
    bodyStroke: '#831843',
    faceColor: '#fce7f3',
    faceStroke: '#be185d',
    description: 'Sweet and colorful'
  },
  volcano: {
    name: 'Volcano',
    price: 75,
    bodyColor: '#7c2d12',
    bodyStroke: '#431407',
    faceColor: '#fb923c',
    faceStroke: '#c2410c',
    description: 'Molten hot cube'
  },
  forest: {
    name: 'Forest',
    price: 55,
    bodyColor: '#15803d',
    bodyStroke: '#052e16',
    faceColor: '#86efac',
    faceStroke: '#166534',
    description: 'Deep woods cube'
  },
  ocean: {
    name: 'Ocean',
    price: 65,
    bodyColor: '#0369a1',
    bodyStroke: '#082f49',
    faceColor: '#06b6d4',
    faceStroke: '#0c4a6e',
    description: 'Deep sea cube'
  },
  storm: {
    name: 'Storm',
    price: 70,
    bodyColor: '#475569',
    bodyStroke: '#1e293b',
    faceColor: '#cbd5e1',
    faceStroke: '#334155',
    description: 'Thunderstorm grey'
  },
  sunset: {
    name: 'Sunset',
    price: 85,
    bodyColor: '#ea580c',
    bodyStroke: '#92400e',
    faceColor: '#fcd34d',
    faceStroke: '#f59e0b',
    description: 'Golden hour vibes'
  },
  midnight: {
    name: 'Midnight',
    price: 90,
    bodyColor: '#1e1b4b',
    bodyStroke: '#0f0d29',
    faceColor: '#818cf8',
    faceStroke: '#4f46e5',
    description: 'Deep night cube'
  },
  shinygold: {
    name: 'Solid Gold',
    price: 150,
    bodyColor: '#d4af37',
    bodyStroke: '#aa8c2c',
    faceColor: '#ffd700',
    faceStroke: '#daa520',
    description: 'Luxurious solid gold',
    isShiny: true
  },
  diamond: {
    name: 'Diamond',
    price: 120,
    bodyColor: '#e0f2fe',
    bodyStroke: '#0284c7',
    faceColor: '#ffffff',
    faceStroke: '#7dd3fc',
    description: 'Precious gem cube',
    isShiny: true
  },
  crystal: {
    name: 'Crystal',
    price: 110,
    bodyColor: '#f3e8ff',
    bodyStroke: '#a78bfa',
    faceColor: '#ede9fe',
    faceStroke: '#c4b5fd',
    description: 'Amethyst crystal cube',
    isShiny: true
  },
  neon: {
    name: 'Neon',
    price: 95,
    bodyColor: '#0f172a',
    bodyStroke: '#00ff00',
    faceColor: '#00ff00',
    faceStroke: '#00aa00',
    description: 'Glowing neon gamer',
    isNeon: true
  },
  fire: {
    name: 'Phoenix',
    price: 105,
    bodyColor: '#7c0000',
    bodyStroke: '#3f0000',
    faceColor: '#ff6b35',
    faceStroke: '#ff4500',
    description: 'Burning hot phoenix'
  },
  quantum: {
    name: 'Quantum',
    price: 0,
    currency: 'challenge',
    challengePrice: 50,
    bodyColor: '#4c0080',
    bodyStroke: '#2a0052',
    faceColor: '#9d00ff',
    faceStroke: '#6a00cc',
    description: 'Phased quantum realm',
    isShiny: true,
    isQuantum: true
  },
  nebula: {
    name: 'Nebula',
    price: 0,
    currency: 'challenge',
    challengePrice: 75,
    bodyColor: '#1a0033',
    bodyStroke: '#0f001a',
    faceColor: '#ff00ff',
    faceStroke: '#cc00ff',
    description: 'Cosmic nebula swirl',
    isShiny: true
  },
  radiant: {
    name: 'Radiant',
    price: 0,
    currency: 'challenge',
    challengePrice: 100,
    bodyColor: '#ffaa00',
    bodyStroke: '#cc8800',
    faceColor: '#ffff00',
    faceStroke: '#ffdd00',
    description: 'Pure radiant energy',
    isShiny: true,
    isRadiant: true
  },
  ethereal: {
    name: 'Ethereal',
    price: 0,
    currency: 'challenge',
    challengePrice: 60,
    bodyColor: '#e0e7ff',
    bodyStroke: '#c7d2fe',
    faceColor: '#f3f4f6',
    faceStroke: '#e5e7eb',
    description: 'Glowing ethereal spirit',
    isShiny: true,
    isEthereal: true
  },
  wisp: {
    name: 'Wisp',
    price: 0,
    currency: 'challenge',
    challengePrice: 85,
    bodyColor: '#a5f3fc',
    bodyStroke: '#7dd3fc',
    faceColor: '#cffafe',
    faceStroke: '#a5f3fc',
    description: 'Luminous wisp of light',
    isShiny: true,
    isWisp: true
  }
};

// Audio system
let audioContext;
let soundEnabled = true;
let backgroundMusic;
let backgroundMusicStarted = false;
let musicTrackIndex = 0;
let currentMusicSignature = null;
const MUSIC_TRACK_URLS = (typeof __PIXEL_DASH_MUSIC_URLS__ !== 'undefined' && Array.isArray(__PIXEL_DASH_MUSIC_URLS__) && __PIXEL_DASH_MUSIC_URLS__.length > 0)
  ? __PIXEL_DASH_MUSIC_URLS__
  : [
      'assets/music/high_score_run.mp3',
      'assets/music/squelchy_basin_run.mp3',
      'assets/music/frozen_ascent.mp3',
      'assets/music/Below_the_Obsidian_Peak.mp3',
      'assets/music/Seven_Thousand_Feet.mp3'
    ];
const KINGDOM_MUSIC_TRACK_INDEX = {
  castle: 0,
  slime: 1,
  ice: 2,
  magma: 3,
  sky: 4
};
const MENU_MUSIC_STATES = new Set(['menu', 'shop', 'settings', 'levelselect']);

function clampVolume(value) {
  return Math.max(0, Math.min(1, value));
}

function setSfxVolume(value, persist = true) {
  playerData.sfxVolume = clampVolume(value);
  if (persist) savePlayerData();
}

function setMusicVolume(value, persist = true) {
  playerData.musicVolume = clampVolume(value);
  if (backgroundMusic) {
    backgroundMusic.volume = playerData.musicVolume;
  }
  if (persist) savePlayerData();
}

function initAudio() {
  if (!audioContext) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported');
        soundEnabled = false;
        return;
      }
      audioContext = new AudioCtx();
    } catch (e) {
      console.error('Failed to initialize audio:', e);
      soundEnabled = false;
    }
  }
}

function playTone(frequency, duration, type = 'square', gain = 0.1) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioContext) return;
  
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  osc.type = type;
  osc.frequency.value = frequency;
  gainNode.gain.setValueAtTime(gain * playerData.sfxVolume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

function playNoteSequence(notes) {
  notes.forEach(note => {
    const [frequency, duration, type, gain, delay] = note;
    setTimeout(() => playTone(frequency, duration, type, gain), delay);
  });
}

function playJumpSound(surfaceType = 0, boosted = false) {
  const jumpSounds = {
    4: [
      [880, 0.07, 'square', 0.12, 0],
      [1175, 0.08, 'triangle', 0.1, 50]
    ],
    5: [
      [220, 0.08, 'sine', 0.14, 0],
      [330, 0.08, 'square', 0.12, 45],
      [440, 0.09, 'triangle', 0.12, 90]
    ],
    default: [
      [400, 0.1, 'square', 0.15, 0],
      [600, 0.08, 'square', 0.12, 50]
    ]
  };

  const selectedNotes = jumpSounds[surfaceType] || jumpSounds.default;
  playNoteSequence(selectedNotes);

  if (boosted) {
    playNoteSequence([
      [selectedNotes[selectedNotes.length - 1][0] + 180, 0.06, 'sine', 0.08, 90]
    ]);
  }
}

function playJumpBoostJumpSound(surfaceType = 0) {
  // Distinct boosted jump cue layered over the surface jump feel.
  playJumpSound(surfaceType, false);
  playNoteSequence([
    [980, 0.06, 'triangle', 0.12, 40],
    [1318, 0.07, 'sine', 0.11, 95],
    [1568, 0.08, 'sine', 0.1, 150]
  ]);
}

function playCrumbleSound() {
  playNoteSequence([
    [260, 0.05, 'sawtooth', 0.12, 0],
    [220, 0.05, 'sawtooth', 0.1, 45],
    [185, 0.06, 'square', 0.08, 90]
  ]);
}

function playPowerupSound() {
  playNoteSequence([
    [784, 0.09, 'sine', 0.18, 0],
    [988, 0.08, 'triangle', 0.14, 70],
    [1175, 0.12, 'sine', 0.12, 140]
  ]);
}

function playDeathJingle() {
  playNoteSequence([
    [220, 0.12, 'sawtooth', 0.18, 0],
    [174, 0.12, 'sawtooth', 0.16, 120],
    [146, 0.16, 'square', 0.14, 240]
  ]);
}

function playLevelCompleteJingle() {
  playNoteSequence([
    [523.25, 0.08, 'triangle', 0.14, 0],
    [659.25, 0.08, 'triangle', 0.14, 110],
    [783.99, 0.1, 'square', 0.16, 220],
    [1046.5, 0.14, 'sine', 0.14, 340]
  ]);
}

function playClickSound() {
  playTone(520, 0.05, 'square', 0.1);
}

function tryStartBackgroundMusic() {
  if (!backgroundMusic || backgroundMusicStarted) return;
  const startPromise = backgroundMusic.play();
  if (startPromise && typeof startPromise.then === 'function') {
    startPromise
      .then(() => {
        backgroundMusicStarted = true;
      })
      .catch(() => {
        // Autoplay may be blocked until first user gesture.
      });
  } else {
    backgroundMusicStarted = true;
  }
}

function getDesiredMusicTrackIndex() {
  if (MENU_MUSIC_STATES.has(state)) {
    return 0;
  }
  if (state === 'playing' || state === 'dead' || state === 'levelcomplete') {
    const level = inDailyChallenge ? null : INITIAL_LEVELS[currentLevel];
    const kingdomKey = level && level.kingdom ? level.kingdom : 'castle';
    return KINGDOM_MUSIC_TRACK_INDEX[kingdomKey] ?? 0;
  }
  return 0;
}

function syncBackgroundMusicToState() {
  if (!backgroundMusic) return;
  const desiredTrackIndex = getDesiredMusicTrackIndex();
  const desiredSignature = `${desiredTrackIndex}`;
  if (currentMusicSignature === desiredSignature) return;
  currentMusicSignature = desiredSignature;
  musicTrackIndex = desiredTrackIndex;
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  backgroundMusic.src = MUSIC_TRACK_URLS[musicTrackIndex];
  backgroundMusic.loop = true;
  backgroundMusic.load();
  backgroundMusicStarted = false;
  tryStartBackgroundMusic();
}

function playCurrentMusicTrack() {
  syncBackgroundMusicToState();
}

function initBackgroundMusic() {
  try {
    backgroundMusic = new Audio();
    backgroundMusic.volume = playerData.musicVolume;
    backgroundMusic.preload = 'auto';
    syncBackgroundMusicToState();
  } catch (e) {
    console.error('Failed to initialize background music:', e);
    backgroundMusic = null;
  }
}

window.addEventListener('load', () => {
  initBackgroundMusic();
  tryStartBackgroundMusic();
});

if (document.readyState !== 'loading') {
  initBackgroundMusic();
}

// Retry playback on first user interaction for browsers that block autoplay.
['pointerdown', 'touchstart', 'keydown', 'click', 'focus'].forEach(eventName => {
  window.addEventListener(eventName, tryStartBackgroundMusic, { passive: true });
});

// Game state
let state = 'menu';
let player, platforms, coins, spikes, camera, score, time, deathY, currentLevel, obstacles, powerups;
let jumpBoostActive = false;
let jumpBoostTimer = 0;
let coinMultiplierActive = false;
let coinMultiplierTimer = 0;
let flyMode = false;
let flyModeTimer = 0;
let inDailyChallenge = false;
let bounceCount = 0;
let maxHeightReached = 440;
let levelDeathStreak = 0;
let achievementToast = null;
let lastGroundSurfaceType = 0;

const ACHIEVEMENTS = {
  firstWin: { name: 'First Victory' },
  coinHunter: { name: 'Coin Hunter' },
  flawless: { name: 'Flawless Run' }
};

function unlockAchievement(achievementId) {
  const unlockedList = playerData.unlockedAchievements
    ? playerData.unlockedAchievements.split(',').map(a => a.trim()).filter(Boolean)
    : [];
  if (!unlockedList.includes(achievementId)) {
    unlockedList.push(achievementId);
    playerData.unlockedAchievements = unlockedList.join(', ');
    const ach = ACHIEVEMENTS[achievementId] || { name: achievementId };
    achievementToast = { text: `🏆 ${ach.name}!`, timer: 180, y: 0 };
    playerData.challenge_points = (playerData.challenge_points || 0) + 10;
    savePlayerData();
    return true;
  }
  return false;
}

// Menu navigation state
let selectedLevel = 0;
let selectedKingdom = 0; // 0 = castle, 1 = ice, 2 = slime, 3 = magma, 4 = sky
let levelSelectScrollY = 0;
let shopScrollY = 0;
let selectedSettingsRow = 0;

// Home icon bounds for click detection
let homeIconBounds = { x: 16, y: 0, w: 40, h: 40 };
let uiButtons = [];
let touchStartX = 0;
let touchStartY = 0;
let lastTouchY = 0;
let isSwipeScrolling = false;

function resetUiButtons() {
  uiButtons = [];
}

function registerUiButton(x, y, w, h, action) {
  // Add small padding to improve touch usability on mobile.
  const pad = 6;
  uiButtons.push({ x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, action });
}

function tryHandleUiTap(tx, ty) {
  for (let i = uiButtons.length - 1; i >= 0; i--) {
    const btn = uiButtons[i];
    if (tx >= btn.x && tx <= btn.x + btn.w && ty >= btn.y && ty <= btn.y + btn.h) {
      btn.action();
      return true;
    }
  }
  return false;
}

function getLevelSelectMaxScroll() {
  const W = canvas.width;
  const H = canvas.height;
  const kingdomKey = ['castle', 'ice', 'slime', 'magma', 'sky'][selectedKingdom];
  const levelCount = INITIAL_LEVELS.filter(l => l.kingdom === kingdomKey).length;
  const levelSize = 80;
  const spacing = 20;
  const levelsPerRow = Math.max(1, Math.floor((W - 40) / (levelSize + spacing)));
  const levelRows = Math.ceil(levelCount / levelsPerRow);
  const contentHeight = levelRows * (levelSize + spacing + 50);
  const visibleHeight = H - 180;
  return Math.max(0, contentHeight - visibleHeight);
}

function getShopMaxScroll() {
  const H = canvas.height;
  const cubeEntries = Object.entries(CUBE_SKINS).sort((a, b) => {
    const aIsChallenge = a[1].currency === 'challenge';
    const bIsChallenge = b[1].currency === 'challenge';
    if (aIsChallenge !== bIsChallenge) return aIsChallenge ? 1 : -1;
    return a[1].price - b[1].price;
  });
  const cubesPerRow = 4;
  const cubeBoxSize = 100;
  const spacing = 20;
  const contentHeight = Math.ceil(cubeEntries.length / cubesPerRow) * (cubeBoxSize + spacing + 60);
  return Math.max(0, contentHeight - (H - 200));
}

function buyOrSelectCube(skinKey) {
  playerData.selected_cube = skinKey;
  const selectedSkin = CUBE_SKINS[playerData.selected_cube];
  const ownedCubes = playerData.owned_cubes.split(',').map(c => c.trim());

  if (!ownedCubes.includes(playerData.selected_cube)) {
    const currency = selectedSkin.currency || 'coins';
    if (currency === 'challenge') {
      if ((playerData.challenge_points || 0) >= selectedSkin.challengePrice) {
        playerData.challenge_points -= selectedSkin.challengePrice;
        playerData.owned_cubes += ',' + playerData.selected_cube;
        savePlayerData();
      }
    } else if (playerData.total_coins >= selectedSkin.price) {
      playerData.total_coins -= selectedSkin.price;
      playerData.owned_cubes += ',' + playerData.selected_cube;
      savePlayerData();
    }
  } else {
    savePlayerData();
  }
}

score = 0;

// Collision
function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function magmaGeyserState(timer) {
  const t = ((timer % MAGMA_GEYSER_CYCLE) + MAGMA_GEYSER_CYCLE) % MAGMA_GEYSER_CYCLE;
  if (t < MAGMA_GEYSER_IDLE) return 'idle';
  if (t < MAGMA_GEYSER_IDLE + MAGMA_GEYSER_WARNING) return 'warning';
  return 'eruption';
}

function getMagmaGeyserHazardRect(platform) {
  const state = magmaGeyserState(platform.geyserTimer || 0);
  if (state !== 'eruption') return null;

  const eruptFrame = (platform.geyserTimer || 0) - (MAGMA_GEYSER_IDLE + MAGMA_GEYSER_WARNING);
  const phase = Math.max(0, Math.min(1, eruptFrame / MAGMA_GEYSER_ERUPTION));
  const intensity = Math.sin(phase * Math.PI);
  const plumeHeight = 34 + intensity * 58;

  return {
    x: platform.x + 4,
    y: platform.y - plumeHeight,
    w: Math.max(8, platform.w - 8),
    h: plumeHeight
  };
}

function update() {
  syncBackgroundMusicToState();

  // Menu navigation
  if (state === 'menu') {
    if (keys['l'] || keys['L']) {
      keys['l'] = false;
      state = 'levelselect';
      selectedLevel = 0;
      levelSelectScrollY = 0;
      selectedKingdom = 0;
    }
    if (keys['s'] || keys['S']) {
      keys['s'] = false;
      state = 'shop';
      shopScrollY = 0;
    }
    if (keys['d'] || keys['D']) {
      keys['d'] = false;
      keys['D'] = false;
      startDailyChallenge();
    }
    if (keys['o'] || keys['O']) {
      keys['o'] = false;
      keys['O'] = false;
      selectedSettingsRow = 0;
      state = 'settings';
    }
    return;
  }

  if (state === 'settings') {
    if (keys['ArrowUp'] || keys['w']) {
      keys['ArrowUp'] = false;
      keys['w'] = false;
      selectedSettingsRow = Math.max(0, selectedSettingsRow - 1);
    }
    if (keys['ArrowDown'] || keys['s']) {
      keys['ArrowDown'] = false;
      keys['s'] = false;
      selectedSettingsRow = Math.min(1, selectedSettingsRow + 1);
    }
    if (keys['ArrowLeft'] || keys['a']) {
      keys['ArrowLeft'] = false;
      keys['a'] = false;
      if (selectedSettingsRow === 0) setSfxVolume(playerData.sfxVolume - 0.05);
      else setMusicVolume(playerData.musicVolume - 0.05);
    }
    if (keys['ArrowRight'] || keys['d']) {
      keys['ArrowRight'] = false;
      keys['d'] = false;
      if (selectedSettingsRow === 0) setSfxVolume(playerData.sfxVolume + 0.05);
      else setMusicVolume(playerData.musicVolume + 0.05);
    }
    if (keys['Escape'] || keys['Backspace'] || keys['Enter'] || keys[' ']) {
      keys['Escape'] = false;
      keys['Backspace'] = false;
      keys['Enter'] = false;
      keys[' '] = false;
      state = 'menu';
    }
    return;
  }

  if (state === 'levelselect') {
    // Kingdom navigation (Left/Right arrows). Resolve opposite-key conflicts safely.
    const wantsLeft = !!(keys['ArrowLeft'] || keys['a']);
    const wantsRight = !!(keys['ArrowRight'] || keys['d']);
    if (wantsRight && !wantsLeft) {
      if (selectedKingdom < 4) {
        selectedKingdom += 1;
        selectedLevel = 0;
        levelSelectScrollY = 0;
      }
      keys['ArrowRight'] = false;
      keys['d'] = false;
      keys['ArrowLeft'] = false;
      keys['a'] = false;
    } else if (wantsLeft && !wantsRight) {
      if (selectedKingdom > 0) {
        selectedKingdom -= 1;
        selectedLevel = 0;
        levelSelectScrollY = 0;
      }
      keys['ArrowLeft'] = false;
      keys['a'] = false;
      keys['ArrowRight'] = false;
      keys['d'] = false;
    }

    // Level selection navigation (Up/Down arrows)
    const kingdomKey = ['castle', 'ice', 'slime', 'magma', 'sky'][selectedKingdom];
    const kingdomLevels = INITIAL_LEVELS.filter(l => l.kingdom === kingdomKey);
    if (keys['ArrowUp'] || keys['w']) {
      keys['ArrowUp'] = false;
      keys['w'] = false;
      selectedLevel = Math.max(0, selectedLevel - 1);
      levelSelectScrollY = Math.max(0, levelSelectScrollY - 90);
    }
    if (keys['ArrowDown'] || keys['s']) {
      keys['ArrowDown'] = false;
      keys['s'] = false;
      selectedLevel = Math.min(kingdomLevels.length - 1, selectedLevel + 1);
      levelSelectScrollY += 90;
    }

    if (keys[' '] || keys['Enter']) {
      keys[' '] = false;
      keys['Enter'] = false;
      const actualLevelIndex = INITIAL_LEVELS.indexOf(kingdomLevels[selectedLevel]);
      initGame(actualLevelIndex);
    }
    // Backspace or Escape to go back
    if (keys['Backspace'] || keys['Escape']) {
      keys['Backspace'] = false;
      keys['Escape'] = false;
      state = 'menu';
    }
    return;
  }

  if (state === 'shop') {
    // Shop scrolling
    if (keys['ArrowUp'] || keys['w']) {
      keys['ArrowUp'] = false;
      keys['w'] = false;
      shopScrollY = Math.max(0, shopScrollY - 100);
    }
    if (keys['ArrowDown'] || keys['s']) {
      keys['ArrowDown'] = false;
      keys['s'] = false;
      shopScrollY += 100;
    }

    // Shop cube selection (use arrow keys to navigate)
    const cubeEntries = Object.entries(CUBE_SKINS).sort((a, b) => {
      const aIsChallenge = a[1].currency === 'challenge';
      const bIsChallenge = b[1].currency === 'challenge';
      if (aIsChallenge !== bIsChallenge) return aIsChallenge ? 1 : -1;
      return a[1].price - b[1].price;
    });

    if (keys['ArrowLeft'] || keys['a']) {
      keys['ArrowLeft'] = false;
      keys['a'] = false;
      let currentIdx = cubeEntries.findIndex(e => e[0] === playerData.selected_cube);
      if (currentIdx > 0) {
        playerData.selected_cube = cubeEntries[currentIdx - 1][0];
      }
    }
    if (keys['ArrowRight'] || keys['d']) {
      keys['ArrowRight'] = false;
      keys['d'] = false;
      let currentIdx = cubeEntries.findIndex(e => e[0] === playerData.selected_cube);
      if (currentIdx < cubeEntries.length - 1) {
        playerData.selected_cube = cubeEntries[currentIdx + 1][0];
      }
    }

    // Try to buy selected cube
    if (keys['Enter']) {
      keys['Enter'] = false;
      buyOrSelectCube(playerData.selected_cube);
    }
    return;
  }

  // Handle Escape key to return to menu from playing, dead, or levelcomplete states
  if ((state === 'playing' || state === 'dead' || state === 'levelcomplete') && 
      (keys['Escape'] || keys['Backspace'])) {
    keys['Escape'] = false;
    keys['Backspace'] = false;
    state = 'menu';
    return;
  }

  if (state !== 'playing') return;
  time++;

  const p = player;

  // Input
  let moveX = 0;
  if (keys['ArrowLeft'] || keys['a'] || touchLeft) moveX = -1;
  if (keys['ArrowRight'] || keys['d'] || touchRight) moveX = 1;
  const jumpPressed = keys['ArrowUp'] || keys['w'] || keys[' '] || touchJump;

  // Movement
  p.vx += moveX * 1.2;

  platforms.forEach(pl => {
    if (pl.type === 6) {
      pl.geyserTimer = ((pl.geyserTimer || 0) + 1) % MAGMA_GEYSER_CYCLE;
    }
    if (pl.type === 7) {
      const prevY = pl.y;
      const speed = Math.max(0.4, Math.min(2.2, pl.speed || 1));
      if (typeof pl.moveDir !== 'number') {
        pl.moveDir = 1;
      }

      pl.y += pl.moveDir * speed;
      if (pl.y <= pl.minY) {
        pl.y = pl.minY;
        pl.moveDir = 1;
      } else if (pl.y >= pl.maxY) {
        pl.y = pl.maxY;
        pl.moveDir = -1;
      }

      const rawDelta = pl.y - prevY;
      pl.deltaY = Math.max(-ELEVATOR_MAX_DELTA, Math.min(ELEVATOR_MAX_DELTA, rawDelta));
      if (pl.deltaY !== rawDelta) {
        pl.y = prevY + pl.deltaY;
      }
    }
  });
  
  // Check if player is on ice platform for reduced friction
  let onIcePlatform = false;
  platforms.forEach(pl => {
    if (pl.type === 4 && pl.visible && rectCollide(p, pl)) {
      onIcePlatform = true;
    }
  });
  
  // Apply friction (much less on ice so it feels slippery)
  p.vx *= onIcePlatform ? ICE_FRICTION : FRICTION;
  if (Math.abs(p.vx) > MOVE_SPEED) p.vx = MOVE_SPEED * Math.sign(p.vx);
  if (Math.abs(p.vx) < 0.1) p.vx = 0;
  if (moveX !== 0) p.facing = moveX;

  // Gravity
  p.vy += GRAVITY;
  if (p.vy > 15) p.vy = 15;

  // Coyote time & jump buffer
  if (p.grounded) p.coyoteTime = 6;
  else p.coyoteTime--;

  if (jumpPressed) p.jumpBuffer = 6;
  else p.jumpBuffer--;

  if (p.jumpBuffer > 0 && p.coyoteTime > 0) {
    p.vy = JUMP_FORCE;
    if (jumpBoostActive) p.vy *= 1.5; // 50% higher jump
    if (jumpBoostActive) {
      playJumpBoostJumpSound(lastGroundSurfaceType);
    } else {
      playJumpSound(lastGroundSurfaceType);
    }
    p.jumpBuffer = 0;
    p.coyoteTime = 0;
    spawnParticles(p.x + p.w / 2, p.y + p.h, config.surface_color, 5);
  }

  // Horizontal collision
  const oldX = p.x;
  p.x += p.vx;
  platforms.forEach(pl => {
    if (!pl.visible) return;
    if (rectCollide(p, pl)) {
      if (p.vx > 0) p.x = pl.x - p.w;
      else if (p.vx < 0) p.x = pl.x + pl.w;
      p.vx = 0;
    }
  });

  // Vertical collision
  const oldY = p.y;
  p.y += p.vy;
  p.grounded = false;
  let groundedPlatform = null;
  
  platforms.forEach(pl => {
    if (!pl.visible) return;
    
    if (rectCollide(p, pl)) {
      const landingTolerance = pl.type === 7 ? 8 + Math.abs(pl.deltaY || 0) : 0;
      const wasAbove = oldY + p.h <= pl.y + landingTolerance;
      const wasBelow = oldY >= pl.y + pl.h;
      
      if (wasAbove && p.vy >= 0) {
        p.y = pl.y - p.h;
        p.grounded = true;
        groundedPlatform = pl;
        lastGroundSurfaceType = pl.type;
        
        if (pl.type === 5) {
          // Slime bounce - super bounce!
          p.vy = JUMP_FORCE * 1.3;
          playJumpSound(5);
          spawnParticles(p.x + p.w / 2, p.y + p.h, '#00ff00', 8);
        } else {
          p.vy = 0;
        }
        
        if (pl.type === 2 && !pl.crumbling) {
          playCrumbleSound();
          pl.crumbling = true;
          pl.crumbleTimer = 0;
        }
      } else if (wasBelow && p.vy < 0) {
        p.y = pl.y + pl.h;
        p.vy = 0;
      }
    }
  });

  // Elevator carry: move with platform delta only while standing on top,
  // and cancel carry when it would overlap another platform.
  if (p.grounded && groundedPlatform && groundedPlatform.type === 7) {
    const carryDeltaY = Math.max(-ELEVATOR_MAX_DELTA, Math.min(ELEVATOR_MAX_DELTA, groundedPlatform.deltaY || 0));
    if (carryDeltaY !== 0) {
      const onTopNow = Math.abs((p.y + p.h) - groundedPlatform.y) <= 5;
      if (onTopNow) {
        const candidate = { x: p.x, y: p.y + carryDeltaY, w: p.w, h: p.h };
        const blocked = platforms.some(pl => pl !== groundedPlatform && pl.visible && rectCollide(candidate, pl));
        if (!blocked) {
          p.y = candidate.y;
        }
      }
    }
  }

  // Coins
  coins.forEach(c => {
    if (!c.collected && rectCollide(p, c)) {
      c.collected = true;
      const coinValue = coinMultiplierActive ? 20 : 10;
      playerData.total_coins += coinValue;
      spawnParticles(c.x + 8, c.y + 8, config.primary_action, 8);
    }
  });

  // Power-ups
  powerups.forEach(pw => {
    if (!pw.collected && rectCollide(p, pw)) {
      pw.collected = true;
      playPowerupSound();
      
      if (pw.type === 'jumpboost') {
        jumpBoostActive = true;
        jumpBoostTimer = 360;
        spawnParticles(pw.x + 7, pw.y + 7, '#00ff00', 12);
      } else if (pw.type === 'coinmultiplier') {
        coinMultiplierActive = true;
        coinMultiplierTimer = 300;
        spawnParticles(pw.x + 7, pw.y + 7, '#ffd700', 15);
      } else if (pw.type === 'flymode') {
        flyMode = true;
        flyModeTimer = 360;
        spawnParticles(pw.x + 7, pw.y + 7, '#00ccff', 15);
      }
    }
  });

  // Update power-up timers
  if (jumpBoostActive) {
    jumpBoostTimer--;
    if (jumpBoostTimer <= 0) jumpBoostActive = false;
  }
  if (coinMultiplierActive) {
    coinMultiplierTimer--;
    if (coinMultiplierTimer <= 0) coinMultiplierActive = false;
  }
  if (flyMode) {
    if (jumpPressed) {
      p.vy = -8;
      spawnParticles(p.x + p.w / 2, p.y + p.h, '#00ccff', 3);
    }
    flyModeTimer--;
    if (flyModeTimer <= 0) flyMode = false;
  }

  // Spike collision detection (instant death)
  for (let i = 0; i < spikes.length; i++) {
    if (rectCollide(p, spikes[i])) {
      if (state !== 'dead') playDeathJingle();
      state = 'dead';
      break;
    }
  }

  // Obstacle collision detection (instant death from saw blades)
  for (let i = 0; i < obstacles.length; i++) {
    if (rectCollide(p, obstacles[i])) {
      if (state !== 'dead') playDeathJingle();
      state = 'dead';
      break;
    }
  }

  // Magma geyser collision detection (instant death)
  for (let i = 0; i < platforms.length; i++) {
    const pl = platforms[i];
    if (pl.type !== 6) continue;
    const hazardRect = getMagmaGeyserHazardRect(pl);
    if (hazardRect && rectCollide(p, hazardRect)) {
      if (state !== 'dead') playDeathJingle();
      state = 'dead';
      break;
    }
  }
  
  // Update obstacle positions (horizontal movement with bounce)
  obstacles.forEach(obs => {
    obs.x += obs.vx;
    if (obs.x <= obs.minX || obs.x >= obs.maxX) {
      obs.vx *= -1;
    }
  });

  // Win condition
  if (state === 'playing') {
    const finish = platforms[platforms.length - 1];
    if (rectCollide(p, { x: finish.x, y: finish.y - 40, w: finish.w, h: 40 })) {
      playLevelCompleteJingle();
      state = 'levelcomplete';
      spawnParticles(p.x + p.w / 2, p.y + p.h / 2, config.primary_action, 30);
    }
  }

  // Death by falling
  if (p.y > deathY) {
    if (state !== 'dead') playDeathJingle();
    state = 'dead';
  }

  // Camera
  camera.x += (p.x - canvas.width / 3 - camera.x) * 0.08;
  camera.y += (p.y - canvas.height / 2 - camera.y) * 0.05;
  if (camera.x < 0) camera.x = 0;

  // Update crumbling platform mechanics
  platforms.forEach(pl => {
    if (pl.type === 2 && pl.crumbling) {
      pl.crumbleTimer++;
      if (pl.crumbleTimer > 30) {
        pl.visible = false; // Disappear after 0.5 seconds
      }
      if (pl.crumbleTimer > 150) {
        pl.visible = true; // Respawn after 2.5 seconds
        pl.crumbling = false;
        pl.crumbleTimer = 0;
      }
    }
  });

  // Particles
  particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.life--; });
  particles = particles.filter(pt => pt.life > 0);
}

function drawCube(x, y, skinKey, eyeState = {}) {
  const skin = CUBE_SKINS[skinKey] || CUBE_SKINS['classic'];
  const cubeSize = 20;
  
  // Special effect: Neon glow
  if (skin.isNeon) {
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 10;
  } else if (skin.isRadiant) {
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 12;
  } else if (skin.isEthereal) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  } else if (skin.isWisp) {
    ctx.shadowColor = '#a5f3fc';
    ctx.shadowBlur = 10;
  } else if (skin.isQuantum) {
    ctx.shadowColor = '#9d00ff';
    ctx.shadowBlur = 8;
  } else if (skin.isShiny) {
    ctx.shadowColor = skin.bodyColor;
    ctx.shadowBlur = 8;
  }
  
  ctx.fillStyle = skin.bodyColor;
  ctx.fillRect(x, y, cubeSize, cubeSize);
  ctx.strokeStyle = skin.bodyStroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, cubeSize, cubeSize);
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  const faceX = x + 2;
  const faceY = y + 2;
  const faceSize = 16;
  
  ctx.fillStyle = skin.faceColor;
  ctx.fillRect(faceX, faceY, faceSize, faceSize);
  ctx.strokeStyle = skin.faceStroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(faceX, faceY, faceSize, faceSize);
  
  // Special: Astronaut helmet visor
  if (skin.isAstronaut) {
    ctx.fillStyle = 'rgba(100, 150, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(faceX + faceSize / 2, faceY + faceSize / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // Eyes track direction only while the player is actively moving with input.
    const eyeY = faceY + 5;
    const eyeSpacing = 5;
    const leftEyeX = faceX + eyeSpacing;
    const rightEyeX = faceX + faceSize - eyeSpacing - 2;
    const eyeSize = 2;
    const isJumping = !!eyeState.isJumping;
    const inputDir = typeof eyeState.inputDir === 'number' ? eyeState.inputDir : 0;
    const isMovingHorizontally = !!eyeState.isMovingHorizontally;

    ctx.fillStyle = '#000';
    if (isJumping) {
      // Eyes look up when jumping
      ctx.fillRect(leftEyeX + 1, eyeY - 3, eyeSize, eyeSize);
      ctx.fillRect(rightEyeX + 1, eyeY - 3, eyeSize, eyeSize);
    } else if (inputDir > 0 && isMovingHorizontally) {
      // Eyes look right
      ctx.fillRect(leftEyeX + 3, eyeY, eyeSize, eyeSize);
      ctx.fillRect(rightEyeX + 3, eyeY, eyeSize, eyeSize);
    } else if (inputDir < 0 && isMovingHorizontally) {
      // Eyes look left
      ctx.fillRect(leftEyeX - 1, eyeY, eyeSize, eyeSize);
      ctx.fillRect(rightEyeX - 1, eyeY, eyeSize, eyeSize);
    } else {
      // Center eyes when idle or when no directional input is active
      ctx.fillRect(leftEyeX + 1, eyeY, eyeSize, eyeSize);
      ctx.fillRect(rightEyeX + 1, eyeY, eyeSize, eyeSize);
    }
    
    // Mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(faceX + 4, faceY + faceSize - 4);
    ctx.lineTo(faceX + faceSize - 4, faceY + faceSize - 4);
    ctx.stroke();
  }
  
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 1, y + 1, 6, 6);
}

// Draw pixel art home icon
function drawHomeIcon(x, y, size = 24, fillColor = '#fff', bgColor = null) {
  const iconSize = size;
  const px = Math.max(1, Math.floor(iconSize / 16));
  const offsetX = x + Math.floor((iconSize - 16 * px) / 2);
  const offsetY = y + Math.floor((iconSize - 16 * px) / 2);
  const drawPx = (gx, gy, w = 1, h = 1) => {
    ctx.fillRect(offsetX + gx * px, offsetY + gy * px, w * px, h * px);
  };
  
  // Draw background circle if specified
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(x + iconSize / 2, y + iconSize / 2, iconSize / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // House silhouette
  ctx.fillStyle = fillColor;
  // Roof
  drawPx(7, 1, 2, 1);
  drawPx(6, 2, 4, 1);
  drawPx(5, 3, 6, 1);
  drawPx(4, 4, 8, 1);
  drawPx(3, 5, 10, 1);
  // Chimney
  drawPx(10, 2, 2, 2);
  // Walls
  drawPx(4, 6, 8, 7);

  // Door cutout and windows for recognizable house shape
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  drawPx(7, 10, 2, 3);
  drawPx(5, 8, 2, 2);
  drawPx(9, 8, 2, 2);
}

function drawPixelCloud(x, y, scale, color) {
  ctx.fillStyle = color;
  const blocks = [
    [2, 0], [3, 0], [4, 0],
    [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
    [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
    [2, 4], [3, 4], [4, 4]
  ];
  blocks.forEach(([bx, by]) => ctx.fillRect(x + bx * scale, y + by * scale, scale, scale));
}

function drawPixelSun(x, y, scale, color) {
  ctx.fillStyle = color;
  const blocks = [
    [2, 0], [3, 0],
    [1, 1], [2, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
    [1, 3], [2, 3], [3, 3], [4, 3],
    [2, 4], [3, 4]
  ];
  blocks.forEach(([bx, by]) => ctx.fillRect(x + bx * scale, y + by * scale, scale, scale));
}

function drawKingdomBackground(kingdom, W, H, t) {
  if (kingdom === 'ice') {
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, W, H);

    // Horizon glow and depth bands
    ctx.fillStyle = '#9edcff';
    ctx.fillRect(0, H * 0.18, W, H * 0.26);
    ctx.fillStyle = '#c9eefc';
    ctx.fillRect(0, H * 0.42, W, H * 0.10);

    // Distant mountains, drawn as triangular silhouettes with lit/shadowed sides.
    const mountainBases = [
      { x: -80, w: 280, h: 170 },
      { x: 140, w: 320, h: 220 },
      { x: 420, w: 280, h: 190 },
      { x: 650, w: 340, h: 240 },
      { x: 930, w: 300, h: 200 }
    ];
    mountainBases.forEach((m, index) => {
      const baseY = H * 0.72;
      const peakX = m.x + m.w / 2 - (camera.x * 0.015);
      const peakY = baseY - m.h;
      const leftColor = index % 2 === 0 ? '#f0f8ff' : '#dbeafe';
      const rightColor = index % 2 === 0 ? '#b284be' : '#7c83a3';
      const bodyColor = index % 2 === 0 ? '#8fb3d9' : '#6b7fa6';

      // Base mountain body, built in stacked triangle bands.
      for (let row = 0; row < m.h; row += 6) {
        const progress = row / m.h;
        const halfWidth = m.w * (1 - progress) * 0.5;
        const y = baseY - row;
        ctx.fillStyle = bodyColor;
        ctx.fillRect(peakX - halfWidth, y, halfWidth * 2, 6);

        // Left side lit, right side shadowed for a classic 8-bit mountain split.
        ctx.fillStyle = leftColor;
        ctx.fillRect(peakX - halfWidth, y, halfWidth * 0.52, 6);
        ctx.fillStyle = rightColor;
        ctx.fillRect(peakX + halfWidth * 0.04, y, halfWidth * 0.48, 6);
      }

      // Snow cap, angled to the left side and punched out with bright pixels.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(peakX - 18, peakY + 10, 18, 6);
      ctx.fillRect(peakX - 12, peakY + 4, 24, 6);
      ctx.fillRect(peakX - 8, peakY - 2, 16, 6);
      ctx.fillStyle = '#f0f8ff';
      ctx.fillRect(peakX - 16, peakY + 16, 14, 4);
      ctx.fillRect(peakX - 4, peakY + 12, 18, 4);
    });

    // Foreground icy ridge to hide the lower mountain bases and increase depth.
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(0, H * 0.76, W, H * 0.24);
    ctx.fillStyle = '#9bb9d6';
    for (let i = 0; i < W; i += 16) {
      const ridgeHeight = 10 + Math.sin((i + t * 0.03) * 0.02) * 3;
      ctx.fillRect(i, H * 0.76 - ridgeHeight, 14, ridgeHeight + 2);
    }

    // Falling snow using pixel dots.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i++) {
      const flakeX = (i * 83 + t * 0.45 + (camera.x * 0.12)) % (W + 40) - 20;
      const flakeY = (i * 47 + t * 1.15) % H;
      ctx.fillRect(flakeX, flakeY, 2, 2);
    }
  } else if (kingdom === 'slime') {
    const skyTop = '#4a148c';
    const skyMid = '#1b5e20';
    const skyLow = '#143d18';
    const slimeBase = '#4caf50';
    const slimeDeep = '#1b5e20';
    const toxicGlow = '#ccff00';
    const vineDark = '#0b3d18';

    // Atmospheric background with a dark-to-murky gradient.
    ctx.fillStyle = skyTop;
    ctx.fillRect(0, 0, W, H * 0.26);
    ctx.fillStyle = skyMid;
    ctx.fillRect(0, H * 0.26, W, H * 0.30);
    ctx.fillStyle = skyLow;
    ctx.fillRect(0, H * 0.56, W, H * 0.22);

    // Distant silhouettes to keep the scene dense and organic.
    ctx.fillStyle = 'rgba(11,61,24,0.9)';
    for (let i = 0; i < 6; i++) {
      const hillX = -40 + i * (W / 5.2) + (camera.x * 0.025) % 70;
      const hillW = 180 + (i % 3) * 50;
      const hillH = 30 + (i % 4) * 14;
      ctx.fillRect(hillX, H * 0.42, hillW, hillH);
      ctx.fillRect(hillX + 18, H * 0.36, hillW * 0.5, 16);
    }

    // Floating island mass, drawn as a chunky silhouette.
    const islandY = H * 0.34;
    ctx.fillStyle = '#2f2f3a';
    ctx.fillRect(W * 0.10, islandY + 18, W * 0.80, 34);
    ctx.fillRect(W * 0.16, islandY + 2, W * 0.68, 20);
    ctx.fillRect(W * 0.24, islandY - 14, W * 0.52, 16);
    ctx.fillRect(W * 0.34, islandY - 28, W * 0.32, 12);

    // Glow-vines, stair-stepped so they feel pixel-organic.
    ctx.fillStyle = vineDark;
    for (let i = 0; i < 14; i++) {
      const vineX = W * 0.05 + i * W * 0.07;
      const vineBase = islandY - 2;
      let vineY = vineBase;
      for (let seg = 0; seg < 10; seg++) {
        const stepX = vineX + ((seg % 2 === 0) ? 0 : 4) + Math.sin((t + i + seg) * 0.01) * 2;
        ctx.fillRect(stepX, vineY, 5, 6);
        vineY += 6;
      }
      ctx.fillStyle = toxicGlow;
      ctx.fillRect(vineX + 2, vineBase + 8, 2, 2);
      ctx.fillStyle = vineDark;
    }

    // Secondary vines hanging from the island underside for extra density.
    for (let i = 0; i < 9; i++) {
      const vineX = W * 0.18 + i * W * 0.09;
      const vineBase = islandY + 14;
      let vineY = vineBase;
      for (let seg = 0; seg < 7; seg++) {
        const stepX = vineX + ((seg % 3) - 1) * 2 + Math.sin((t * 0.015) + i + seg) * 1.5;
        ctx.fillRect(stepX, vineY, 4, 5);
        vineY += 5;
      }
      ctx.fillStyle = toxicGlow;
      ctx.fillRect(vineX + 1, vineBase + 6, 2, 2);
      ctx.fillStyle = vineDark;
    }

    // Slime river: rounded bubbling mounds with a wet highlight.
    const riverY = H * 0.74;
    ctx.fillStyle = slimeDeep;
    ctx.fillRect(0, riverY, W, H - riverY);
    for (let x = -20; x < W + 30; x += 26) {
      const bubbleH = 8 + ((Math.floor((x + t * 0.6) / 26) % 3) * 3);
      const bubbleY = riverY - bubbleH + Math.sin((x + t * 0.04) * 0.07) * 2;
      ctx.fillStyle = slimeBase;
      ctx.fillRect(x, bubbleY + 2, 24, bubbleH + 4);
      ctx.fillRect(x + 4, bubbleY - 1, 16, bubbleH + 2);
      ctx.fillStyle = toxicGlow;
      ctx.fillRect(x + 4, bubbleY, 16, 2);
    }
    ctx.fillStyle = '#1f7f2a';
    ctx.fillRect(0, riverY + 6, W, 2);
    ctx.fillRect(0, riverY + 15, W, 2);
    ctx.fillRect(0, riverY + 24, W, 2);

    // Drip particles: stretch, drop, and splash with a tiny three-frame loop.
    ctx.fillStyle = toxicGlow;
    for (let i = 0; i < 10; i++) {
      const dripSeed = i * 31;
      const dripX = W * 0.18 + (i * W * 0.08) + (camera.x * 0.03);
      const phase = Math.floor((t / 18 + i) % 5);
      const dripY = islandY + 8 + (i % 3) * 6;
      if (phase === 0) {
        ctx.fillRect(dripX, dripY, 2, 1);
      } else if (phase === 1) {
        ctx.fillRect(dripX, dripY, 2, 3);
      } else if (phase === 2) {
        ctx.fillRect(dripX - 1, dripY + 2, 4, 3);
      } else if (phase === 3) {
        ctx.fillRect(dripX, riverY - 12 + ((dripSeed + t) % 10), 2, 4);
      } else {
        const splashY = riverY + 2 + (dripSeed % 6);
        ctx.fillRect(dripX - 2, splashY, 1, 1);
        ctx.fillRect(dripX, splashY - 1, 3, 1);
        ctx.fillRect(dripX + 2, splashY, 1, 1);
      }
    }

    // Bubbles rising and popping from the slime surface.
    ctx.fillStyle = toxicGlow;
    for (let i = 0; i < 20; i++) {
      const bubbleX = (i * 67 + t * 0.9 + camera.x * 0.08) % (W + 20) - 10;
      const bubbleRise = (Math.sin((t + i * 14) * 0.04) * 10) + (i % 4) * 2;
      const bubbleY = riverY - 10 - bubbleRise;
      const popPhase = Math.floor((t / 14 + i) % 3);
      if (popPhase === 0) {
        ctx.fillRect(bubbleX, bubbleY, 2, 2);
      } else if (popPhase === 1) {
        ctx.fillRect(bubbleX - 1, bubbleY, 4, 3);
        ctx.fillRect(bubbleX, bubbleY - 1, 2, 5);
      } else {
        ctx.fillRect(bubbleX - 2, bubbleY + 1, 1, 1);
        ctx.fillRect(bubbleX + 2, bubbleY + 1, 1, 1);
        ctx.fillRect(bubbleX, bubbleY - 1, 1, 1);
      }
    }

    // Bottom mist/gas band to soften the silhouette.
    ctx.fillStyle = 'rgba(11,61,24,0.72)';
    ctx.fillRect(0, H * 0.88, W, H * 0.12);
    ctx.fillStyle = 'rgba(74,20,140,0.18)';
    ctx.fillRect(0, H * 0.12, W, 8);
  } else if (kingdom === 'sky') {
    // Sunrise sky gradient.
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(0, 0, W, H * 0.24);
    ctx.fillStyle = '#fdba74';
    ctx.fillRect(0, H * 0.24, W, H * 0.20);
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(0, H * 0.44, W, H * 0.26);
    ctx.fillStyle = '#ddd6fe';
    ctx.fillRect(0, H * 0.70, W, H * 0.30);

    // Sunrise sun halo.
    const sunX = W * 0.18;
    const sunY = H * 0.18;
    ctx.fillStyle = 'rgba(255,245,220,0.55)';
    ctx.fillRect(sunX - 38, sunY - 22, 76, 44);
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(sunX - 22, sunY - 14, 44, 28);
    ctx.fillStyle = '#fdba74';
    ctx.fillRect(sunX - 12, sunY - 8, 24, 16);

    // Layered cloud bands with subtle parallax motion.
    const cloudBands = [
      { y: H * 0.22, speed: 0.02, color: '#fff7ed', scale: 7, count: 8 },
      { y: H * 0.40, speed: 0.035, color: '#ffffff', scale: 8, count: 10 },
      { y: H * 0.60, speed: 0.05, color: '#f8fafc', scale: 9, count: 12 },
      { y: H * 0.78, speed: 0.08, color: '#eef2ff', scale: 10, count: 13 }
    ];

    cloudBands.forEach((band, bandIdx) => {
      for (let i = 0; i < band.count; i++) {
        const spread = (W + 120) / band.count;
        const drift = ((camera.x * band.speed) + (i * spread) + (bandIdx * 17)) % (W + 140) - 70;
        const wobble = Math.sin((t * 0.015) + i + bandIdx) * 4;
        drawPixelCloud(drift, band.y + wobble, band.scale, band.color);
      }
    });

    // Foreground cloud shelf.
    ctx.fillStyle = '#ffffff';
    for (let i = -40; i < W + 80; i += 34) {
      const puff = 12 + Math.sin((i + t * 0.08) * 0.03) * 3;
      ctx.fillRect(i, H * 0.86 - puff, 30, puff + 6);
    }
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(0, H * 0.89, W, H * 0.11);
  } else if (kingdom === 'magma') {
    ctx.fillStyle = '#2a0d09';
    ctx.fillRect(0, 0, W, H);

    // Ember sky bands.
    ctx.fillStyle = '#4a1610';
    ctx.fillRect(0, H * 0.10, W, H * 0.26);
    ctx.fillStyle = '#6b1f12';
    ctx.fillRect(0, H * 0.36, W, H * 0.18);
    ctx.fillStyle = '#2f1310';
    ctx.fillRect(0, H * 0.54, W, H * 0.24);

    // Volcano silhouette.
    const volcanoX = W * 0.62 - camera.x * 0.03;
    const volcanoY = H * 0.74;
    const craterX = volcanoX - 10;
    ctx.fillStyle = '#1b0f10';
    ctx.beginPath();
    ctx.moveTo(volcanoX - 210, volcanoY);
    ctx.lineTo(volcanoX - 100, volcanoY - 170);
    ctx.lineTo(volcanoX - 30, volcanoY - 215);
    ctx.lineTo(volcanoX + 50, volcanoY - 165);
    ctx.lineTo(volcanoX + 190, volcanoY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff7a18';
    ctx.fillRect(craterX - 28, volcanoY - 210, 56, 8);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(craterX - 18, volcanoY - 205, 36, 5);

    // Lava pool centered with the volcano base.
    ctx.fillStyle = '#5a1612';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
    const poolW = Math.min(W * 0.56, 520);
    const poolX = Math.max(-30, Math.min(W - poolW + 30, volcanoX - poolW / 2));
    const poolY = H * 0.82;
    const poolH = H * 0.12;
    ctx.fillStyle = '#3f1511';
    ctx.fillRect(poolX - 16, poolY - 6, poolW + 32, poolH + 12);
    ctx.fillStyle = '#7a2116';
    ctx.fillRect(poolX, poolY, poolW, poolH);
    for (let i = -10; i < poolW + 10; i += 26) {
      const px = poolX + i;
      const wave = Math.sin((i + t * 0.06) * 0.1) * 4;
      ctx.fillStyle = '#ff4f1c';
      ctx.fillRect(px, poolY + wave, 18, 6);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(px + 3, poolY + wave + 1, 8, 2);
    }

    // Falling ash.
    ctx.fillStyle = 'rgba(220, 190, 170, 0.45)';
    for (let i = 0; i < 90; i++) {
      const ashX = (i * 71 + camera.x * 0.08 + t * 0.3) % (W + 20) - 10;
      const ashY = (i * 53 + t * 0.8) % H;
      const ashSize = i % 3 === 0 ? 2 : 1;
      ctx.fillRect(ashX, ashY, ashSize, ashSize);
    }

    // Eruption sparks above the crater.
    ctx.fillStyle = '#ffcf66';
    for (let i = 0; i < 22; i++) {
      const sparkX = craterX + ((i % 5) - 2) * 10 + Math.sin((t + i * 17) * 0.04) * 6;
      const sparkRise = (t * 1.2 + i * 14) % 110;
      const sparkY = volcanoY - 210 - sparkRise;
      if (sparkY > 0) {
        ctx.fillRect(sparkX, sparkY, 2, 2);
      }
    }
  } else {
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#a8d8f0';
    ctx.fillRect(0, H * 0.20, W, H * 0.80);

    // Layered clouds for parallax depth.
    drawPixelCloud(50 + (camera.x * 0.04) % 80, 40, 6, '#dff7ff');
    drawPixelCloud(W * 0.26 + (camera.x * 0.02) % 60, 24, 7, '#ffffff');
    drawPixelCloud(W * 0.60 + (camera.x * 0.03) % 90, 56, 6, '#d7eef8');

    // Bright sun with dithering glow.
    const sunX = W - 150;
    const sunY = 36;
    ctx.fillStyle = '#fff7b2';
    for (let dx = -3; dx <= 18; dx++) {
      for (let dy = -3; dy <= 18; dy++) {
        const dist = Math.abs(dx - 8) + Math.abs(dy - 8);
        if (dist <= 11 && ((dx + dy) & 1) === 0) {
          ctx.fillRect(sunX + dx, sunY + dy, 3, 3);
        }
      }
    }
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(sunX + 5, sunY + 5, 18, 18);
    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(sunX + 8, sunY + 8, 10, 10);

    // Castle silhouettes: spires and battlements at the horizon.
    const skylineY = H * 0.76;
    ctx.fillStyle = '#7c8fb8';
    ctx.fillRect(0, skylineY, W, H - skylineY);
    ctx.fillStyle = '#6b7da8';
    for (let i = 0; i < 7; i++) {
      const spireX = i * (W / 7) - 20 + (camera.x * 0.06) % 40;
      const towerW = 22 + (i % 3) * 8;
      const towerH = 26 + (i % 4) * 10;
      ctx.fillRect(spireX, skylineY - towerH, towerW, towerH);
      ctx.fillRect(spireX - 6, skylineY - towerH - 10, towerW + 12, 10);
      ctx.fillRect(spireX + towerW / 2 - 4, skylineY - towerH - 18, 8, 18);
      ctx.fillStyle = '#d9e5f5';
      ctx.fillRect(spireX + 4, skylineY - towerH - 6, towerW - 8, 4);
      ctx.fillStyle = '#6b7da8';
    }
  }
}

function getDrawBackgroundKingdom() {
  if (state === 'dead' || state === 'levelcomplete') {
    const level = inDailyChallenge ? null : INITIAL_LEVELS[currentLevel];
    return (level && level.kingdom) || 'castle';
  }
  return null;
}

function draw() {
  const W = canvas.width, H = canvas.height;
  const bg = config.background_color || defaultConfig.background_color;
  const surf = config.surface_color || defaultConfig.surface_color;
  const txt = config.text_color || defaultConfig.text_color;
  const accent = config.primary_action || defaultConfig.primary_action;
  const sec = config.secondary_action || defaultConfig.secondary_action;
  const title = config.game_title || defaultConfig.game_title;
  
  // Update home icon bounds to bottom left corner
  homeIconBounds = { x: 14, y: H - 62, w: 56, h: 56 };
  resetUiButtons();

  ctx.clearRect(0, 0, W, H);
  const backgroundKingdom = getDrawBackgroundKingdom();
  if (backgroundKingdom) {
    drawKingdomBackground(backgroundKingdom, W, H, time);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  if (state === 'menu') {
    ctx.textAlign = 'center';
    ctx.fillStyle = surf;
    ctx.font = 'bold 48px Silkscreen, Arial, sans-serif';
    ctx.fillText(title, W / 2, H / 2 - 100);

    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys or WASD to move', W / 2, H / 2 + 50);
    ctx.fillText('Up / W / Space to jump', W / 2, H / 2 + 80);

    ctx.fillStyle = sec;
    ctx.font = 'bold 20px Silkscreen';
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillText('[ PRESS SPACE OR TAP TO START ]', W / 2, H / 2 + 160);
    ctx.globalAlpha = 1;
    registerUiButton(W / 2 - 200, H / 2 + 135, 400, 40, () => initGame(0));

    // Menu buttons with labels
    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - 130, H / 2 + 220, 100, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText('LEVELS', W / 2 - 80, H / 2 + 245);
    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText('[L]', W / 2 - 80, H / 2 + 265);
    registerUiButton(W / 2 - 130, H / 2 + 220, 100, 40, () => {
      state = 'levelselect';
      selectedLevel = 0;
      levelSelectScrollY = 0;
      selectedKingdom = 0;
    });

    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 + 30, H / 2 + 220, 100, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText('SHOP', W / 2 + 80, H / 2 + 245);
    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText('[S]', W / 2 + 80, H / 2 + 265);
    registerUiButton(W / 2 + 30, H / 2 + 220, 100, 40, () => {
      state = 'shop';
      shopScrollY = 0;
    });

    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 + 30, H / 2 + 285, 100, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Silkscreen';
    ctx.fillText('AUDIO', W / 2 + 80, H / 2 + 310);
    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText('[O]', W / 2 + 80, H / 2 + 330);
    registerUiButton(W / 2 + 30, H / 2 + 285, 100, 40, () => {
      selectedSettingsRow = 0;
      state = 'settings';
    });

    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - 130, H / 2 + 285, 100, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Silkscreen';
    ctx.fillText('DAILY', W / 2 - 80, H / 2 + 310);
    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText('[D]', W / 2 - 80, H / 2 + 330);
    registerUiButton(W / 2 - 130, H / 2 + 285, 100, 40, () => {
      startDailyChallenge();
    });

    ctx.fillStyle = txt;
    ctx.font = '12px Silkscreen, Arial, sans-serif';
    const todayDate = getTodayDate();
    const bestDaily = playerData.daily_date === todayDate ? playerData.daily_score : 0;
    const bestText = bestDaily > 0 ? `${bestDaily}s` : '--';
    ctx.fillText(`Daily Best: ${bestText}`, W / 2, H / 2 + 365);
    ctx.fillText('Audio settings: [O] / AUDIO button', W / 2, H / 2 + 393);

    return;
  }

  if (state === 'settings') {
    ctx.textAlign = 'center';
    ctx.fillStyle = surf;
    ctx.font = 'bold 38px Silkscreen';
    ctx.fillText('AUDIO SETTINGS', W / 2, 90);

    const drawVolumeRow = (label, value, rowIndex, onDecrease, onIncrease) => {
      const y = 170 + rowIndex * 130;
      const isSelected = selectedSettingsRow === rowIndex;
      const barWidth = 260;
      const barHeight = 22;
      const barX = W / 2 - barWidth / 2;
      const percent = Math.round(value * 100);

      ctx.fillStyle = isSelected ? accent : txt;
      ctx.font = 'bold 18px Silkscreen';
      ctx.fillText(`${label}: ${percent}%`, W / 2, y - 22);

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(barX, y, barWidth, barHeight);
      ctx.fillStyle = isSelected ? accent : sec;
      ctx.fillRect(barX, y, barWidth * value, barHeight);
      ctx.strokeStyle = txt;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, y, barWidth, barHeight);

      ctx.fillStyle = sec;
      ctx.fillRect(barX - 70, y - 2, 48, 28);
      ctx.fillRect(barX + barWidth + 22, y - 2, 48, 28);
      ctx.fillStyle = txt;
      ctx.font = 'bold 20px Silkscreen';
      ctx.fillText('-', barX - 46, y + 19);
      ctx.fillText('+', barX + barWidth + 46, y + 19);

      registerUiButton(barX - 70, y - 2, 48, 28, onDecrease);
      registerUiButton(barX + barWidth + 22, y - 2, 48, 28, onIncrease);
    };

    drawVolumeRow('SFX VOLUME', playerData.sfxVolume, 0,
      () => setSfxVolume(playerData.sfxVolume - 0.05),
      () => setSfxVolume(playerData.sfxVolume + 0.05)
    );
    drawVolumeRow('MUSIC VOLUME', playerData.musicVolume, 1,
      () => setMusicVolume(playerData.musicVolume - 0.05),
      () => setMusicVolume(playerData.musicVolume + 0.05)
    );

    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText('Arrow Up/Down: Select • Arrow Left/Right: Adjust • Enter/Esc: Back', W / 2, H - 70);

    ctx.fillStyle = sec;
    ctx.fillRect(W / 2 - 80, H - 55, 160, 36);
    ctx.fillStyle = txt;
    ctx.font = 'bold 14px Silkscreen';
    ctx.fillText('BACK TO MENU', W / 2, H - 31);
    registerUiButton(W / 2 - 80, H - 55, 160, 36, () => {
      state = 'menu';
    });
  }

  if (state === 'levelselect') {
    // KINGDOM-BASED LEVEL SELECT
    const kingdomNames = ['Castle Kingdom', 'Ice Kingdom', 'Slime Kingdom', 'Magma Kingdom', 'Sky Kingdom'];
    const kingdomKey = ['castle', 'ice', 'slime', 'magma', 'sky'][selectedKingdom];
    
    ctx.textAlign = 'center';
    ctx.fillStyle = surf;
    ctx.font = 'bold 36px Silkscreen';
    ctx.fillText(kingdomNames[selectedKingdom], W / 2, 80);

    // Get levels for current kingdom
    const kingdomLevels = INITIAL_LEVELS.filter(l => l.kingdom === kingdomKey);
    const levelSize = 80;
    const spacing = 20;
    const levelsPerRow = Math.floor((W - 40) / (levelSize + spacing));
    const levelRows = Math.ceil(kingdomLevels.length / levelsPerRow);
    const contentHeight = levelRows * (levelSize + spacing + 50);
    const visibleHeight = H - 180;
    const maxScroll = Math.max(0, contentHeight - visibleHeight);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 120, W, visibleHeight);
    ctx.clip();

    for (let i = 0; i < kingdomLevels.length; i++) {
      const col = i % levelsPerRow;
      const row = Math.floor(i / levelsPerRow);
      const lx = W / 2 - (levelsPerRow * (levelSize + spacing)) / 2 + col * (levelSize + spacing);
      const ly = 140 + row * (levelSize + spacing + 50) - levelSelectScrollY;

      if (ly + levelSize < 120 || ly > H - 60) continue;

      const isSelected = i === selectedLevel;
      const levelData = kingdomLevels[i];
      const actualLevelIndex = INITIAL_LEVELS.indexOf(levelData);

      // Draw selection highlight
      if (isSelected) {
        ctx.fillStyle = accent;
        ctx.fillRect(lx - 4, ly - 4, levelSize + 8, levelSize + 8);
      }

      // Draw level box
      ctx.fillStyle = isSelected ? accent + '80' : sec + '40';
      ctx.fillRect(lx, ly, levelSize, levelSize);
      ctx.strokeStyle = isSelected ? accent : txt;
      ctx.lineWidth = 2;
      ctx.strokeRect(lx, ly, levelSize, levelSize);

      // Draw level number (1-15 within kingdom)
      ctx.fillStyle = txt;
      ctx.font = 'bold 28px Silkscreen';
      ctx.textAlign = 'center';
      ctx.fillText(i + 1, lx + levelSize / 2, ly + levelSize / 2 + 12);

      // Draw level name below
      ctx.fillStyle = txt;
      ctx.font = '14px Silkscreen, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(levelData.name, lx + levelSize / 2, ly + levelSize + 20);
      registerUiButton(lx, ly, levelSize, levelSize, () => {
        selectedLevel = i;
        initGame(actualLevelIndex);
      });
    }

    ctx.restore();

    // Navigation info
    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys or scroll to browse • Space to play', W / 2, H - 60);

    // Play button
    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - 60, H - 45, 120, 35);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 13px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText('PLAY LEVEL', W / 2, H - 20);
    const actualLevelIndex = INITIAL_LEVELS.indexOf(INITIAL_LEVELS.filter(l => l.kingdom === kingdomKey)[selectedLevel]);
    registerUiButton(W / 2 - 60, H - 45, 120, 35, () => initGame(actualLevelIndex));

    // Back button
    ctx.fillStyle = sec;
    ctx.fillRect(20, H - 45, 60, 35);
    ctx.fillStyle = txt;
    ctx.font = 'bold 11px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText('BACK', 50, H - 20);
    registerUiButton(20, H - 45, 60, 35, () => { state = 'menu'; });

    // LEFT ARROW - go back to previous kingdom
    if (selectedKingdom > 0) {
      ctx.fillStyle = accent;
      ctx.fillRect(30, H / 2 - 25, 50, 50);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 30px Silkscreen';
      ctx.textAlign = 'center';
      ctx.fillText('<', 55, H / 2 + 12);
      registerUiButton(30, H / 2 - 25, 50, 50, () => {
        selectedKingdom = Math.max(0, selectedKingdom - 1);
        selectedLevel = 0;
        levelSelectScrollY = 0;
      });
    }

    // RIGHT ARROW - go to next kingdom (disabled on last kingdom)
    if (selectedKingdom < 4) {
      ctx.fillStyle = accent;
      ctx.fillRect(W - 80, H / 2 - 25, 50, 50);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 30px Silkscreen';
      ctx.textAlign = 'center';
      ctx.fillText('>', W - 55, H / 2 + 12);
      registerUiButton(W - 80, H / 2 - 25, 50, 50, () => {
        selectedKingdom = Math.min(4, selectedKingdom + 1);
        selectedLevel = 0;
        levelSelectScrollY = 0;
      });
    }
  }

  if (state === 'shop') {
    ctx.textAlign = 'center';
    ctx.fillStyle = surf;
    ctx.font = 'bold 40px Silkscreen';
    ctx.fillText('CUBE SHOP', W / 2, 60);

    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText(`Your Coins: ${playerData.total_coins}`, W / 2, 100);

    ctx.fillStyle = '#ffd700';
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText(`Challenge Points: ${playerData.challenge_points || 0}`, W / 2, 118);

    // Create clip region for scrollable area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 130, W, H - 200);
    ctx.clip();

    // Create cube list with sorting
    const cubeEntries = Object.entries(CUBE_SKINS).sort((a, b) => {
      const aIsChallenge = a[1].currency === 'challenge';
      const bIsChallenge = b[1].currency === 'challenge';
      if (aIsChallenge !== bIsChallenge) return aIsChallenge ? 1 : -1;
      return a[1].price - b[1].price;
    });
    const cubesPerRow = 4;
    const cubeBoxSize = 100;
    const spacing = 20;
    const contentHeight = Math.ceil(cubeEntries.length / cubesPerRow) * (cubeBoxSize + spacing + 60);
    const maxScroll = Math.max(0, contentHeight - (H - 200));

    cubeEntries.forEach((entry, idx) => {
      const [skinKey, skinData] = entry;
      const row = Math.floor(idx / cubesPerRow);
      const col = idx % cubesPerRow;
      const x = W / 2 - (cubesPerRow * (cubeBoxSize + spacing)) / 2 + col * (cubeBoxSize + spacing);
      const y = 140 + row * (cubeBoxSize + spacing + 60) - shopScrollY;

      if (y + cubeBoxSize < 130 || y > H - 70) return;

      const ownedCubes = playerData.owned_cubes.split(',').map(c => c.trim());
      const isOwned = ownedCubes.includes(skinKey);
      const isSelected = playerData.selected_cube === skinKey;
      const canAfford = playerData.total_coins >= skinData.price;
      const canAffordChallenge = (playerData.challenge_points || 0) >= (skinData.challengePrice || 0);

      // Draw selection highlight
      if (isSelected) {
        ctx.fillStyle = accent;
        ctx.fillRect(x - 3, y - 3, cubeBoxSize + 6, cubeBoxSize + 6);
      }

      // Draw level box
      ctx.fillStyle = isSelected ? accent + '80' : sec + '40';
      ctx.fillRect(x, y, cubeBoxSize, cubeBoxSize);
      ctx.strokeStyle = isSelected ? accent : txt;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cubeBoxSize, cubeBoxSize);

      // Draw preview cube
      const previewScale = 0.8;
      drawCube(x + cubeBoxSize / 2 - 10 * previewScale, y + 20, skinKey);

      // Draw info
      ctx.fillStyle = txt;
      ctx.font = 'bold 12px Silkscreen';
      ctx.textAlign = 'center';
      ctx.fillText(skinData.name, x + cubeBoxSize / 2, y + 70);

      if (isOwned) {
        if (isSelected) {
          ctx.fillStyle = accent;
          ctx.font = 'bold 11px Silkscreen';
          ctx.fillText('EQUIPPED', x + cubeBoxSize / 2, y + 90);
        } else {
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 11px Silkscreen';
          ctx.fillText('OWNED', x + cubeBoxSize / 2, y + 90);
        }
      } else {
        const currency = skinData.currency || 'coins';
        if (currency === 'challenge') {
          if ((playerData.challenge_points || 0) >= skinData.challengePrice) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 11px Silkscreen';
            ctx.fillText(`${skinData.challengePrice}⭐`, x + cubeBoxSize / 2, y + 90);
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 11px Silkscreen';
            ctx.fillText(`${skinData.challengePrice}⭐`, x + cubeBoxSize / 2, y + 90);
          }
        } else {
          if (canAfford) {
            ctx.fillStyle = accent;
            ctx.font = 'bold 11px Silkscreen';
            ctx.fillText(`${skinData.price}$`, x + cubeBoxSize / 2, y + 90);
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 11px Silkscreen';
            ctx.fillText(`${skinData.price}$`, x + cubeBoxSize / 2, y + 90);
          }
        }
      }

      registerUiButton(x, y, cubeBoxSize, cubeBoxSize, () => {
        buyOrSelectCube(skinKey);
      });
    });

    ctx.restore();

    // Back button
    ctx.fillStyle = sec;
    ctx.fillRect(W / 2 - 70, H - 60, 140, 40);
    ctx.fillStyle = txt;
    ctx.font = 'bold 14px Silkscreen';
    ctx.fillText('[ SPACE TO BACK ]', W / 2, H - 35);
    registerUiButton(W / 2 - 70, H - 60, 140, 40, () => {
      state = 'menu';
    });

    if (keys[' '] || keys['Enter']) {
      keys[' '] = false;
      keys['Enter'] = false;
      state = 'menu';
    }
  }

  if (state === 'playing') {
    const level = INITIAL_LEVELS[currentLevel] || INITIAL_LEVELS[0];
    drawKingdomBackground(level.kingdom || 'castle', W, H, time);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    const kingdomTheme = {
      castle: { normal: '#a78baf', dark: '#8b7b9f', top: '#7cb342', flagColor: '#ff6b6b' },
      ice: { normal: '#b3e5fc', dark: '#80deea', top: '#e1f5fe', flagColor: '#81d4fa' },
      slime: { normal: '#7cb342', dark: '#558b2f', top: '#aeea00', flagColor: '#9ccc65' },
      magma: { normal: '#4c3b44', dark: '#2d2329', top: '#9a6c4a', flagColor: '#ff7a18' },
      sky: { normal: '#ffffff', dark: '#ddd6fe', top: '#e9d5ff', flagColor: '#fdba74' }
    };
    const theme = kingdomTheme[level.kingdom] || kingdomTheme.castle;

    // Platforms with type-specific rendering
    platforms.forEach(pl => {
      if (!pl.visible) return;

      if (pl.type === 2) {
        if (pl.crumbling) {
          ctx.globalAlpha = 1 - pl.crumbleTimer / 30;
        }
        ctx.fillStyle = theme.normal;
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        for (let i = 0; i < pl.w; i += 8) {
          ctx.fillStyle = theme.dark;
          ctx.fillRect(pl.x + i, pl.y, 1, pl.h);
        }
        const crackColor = level.kingdom === 'magma'
          ? '#9ca3af'
          : level.kingdom === 'sky'
            ? '#c4b5fd'
            : '#3f3350';
        ctx.strokeStyle = crackColor;
        ctx.lineWidth = 2;
        const crackPoints = [0.18, 0.38, 0.62, 0.82];
        crackPoints.forEach((t, idx) => {
          const x0 = pl.x + pl.w * t;
          const x1 = x0 + (idx % 2 === 0 ? -6 : 6);
          const x2 = x1 + (idx % 2 === 0 ? 8 : -8);
          ctx.beginPath();
          ctx.moveTo(x0, pl.y + 1);
          ctx.lineTo(x1, pl.y + pl.h * 0.45);
          ctx.lineTo(x2, pl.y + pl.h - 1);
          ctx.stroke();
        });
        ctx.fillStyle = theme.top;
        for (let i = 0; i < pl.w; i += 4) {
          const grassHeight = 2 + Math.sin(i * 0.1) * 1;
          ctx.fillRect(pl.x + i, pl.y - grassHeight, 3, grassHeight);
        }
        if (pl.crumbling) {
          ctx.globalAlpha = 1;
        }
      } else if (pl.type === 4) {
        ctx.fillStyle = '#b3e5fc';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.strokeStyle = '#80deea';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const startX = pl.x + platformVisualRng.next() * pl.w;
          const endX = pl.x + platformVisualRng.next() * pl.w;
          ctx.beginPath();
          ctx.moveTo(startX, pl.y);
          ctx.lineTo(endX, pl.y + pl.h);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(pl.x + 2, pl.y + 2, pl.w - 4, 4);
      } else if (pl.type === 5) {
        ctx.fillStyle = '#76ff03';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.strokeStyle = '#64dd17';
        ctx.lineWidth = 2;
        ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
        ctx.strokeStyle = '#558b2f';
        ctx.lineWidth = 1;
        for (let i = 0; i < pl.w; i += 8) {
          const waveHeight = Math.sin(i * 0.15 + time * 0.05) * 2;
          ctx.beginPath();
          ctx.moveTo(pl.x + i, pl.y);
          ctx.lineTo(pl.x + i + 4, pl.y - waveHeight);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(pl.x + 2, pl.y + 2, pl.w - 4, 3);
      } else if (pl.type === 6) {
        const geyserState = magmaGeyserState(pl.geyserTimer || 0);

        // Obsidian vent base
        ctx.fillStyle = '#2a2126';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.fillStyle = '#4a3a42';
        for (let i = 2; i < pl.w; i += 10) {
          ctx.fillRect(pl.x + i, pl.y + 2, 2, pl.h - 4);
        }
        ctx.fillStyle = '#ff7a18';
        for (let i = 6; i < pl.w - 4; i += 12) {
          ctx.fillRect(pl.x + i, pl.y + 3, 3, 4);
        }

        if (geyserState === 'warning') {
          const pulse = 0.55 + Math.sin(time * 0.35) * 0.25;
          ctx.fillStyle = `rgba(255, 122, 24, ${pulse})`;
          ctx.fillRect(pl.x + 2, pl.y - 6, pl.w - 4, 6);
          ctx.fillStyle = '#ffd166';
          ctx.fillRect(pl.x + pl.w / 2 - 2, pl.y - 10, 4, 4);
        }

        if (geyserState === 'eruption') {
          const hazard = getMagmaGeyserHazardRect(pl);
          if (hazard) {
            ctx.fillStyle = '#ff4f1c';
            ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
            ctx.fillStyle = '#ffb347';
            ctx.fillRect(hazard.x + 3, hazard.y + 4, Math.max(2, hazard.w - 6), Math.max(4, hazard.h * 0.55));
            ctx.fillStyle = 'rgba(255, 220, 150, 0.65)';
            for (let i = 0; i < hazard.w; i += 8) {
              ctx.fillRect(hazard.x + i, hazard.y + 2 + Math.sin((time + i) * 0.2) * 2, 3, 3);
            }
          }
        }
      } else if (pl.type === 7) {
        // Elevator platform (sky kingdom): white + pastel purple with motion indicator.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.strokeStyle = '#c4b5fd';
        ctx.lineWidth = 2;
        ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
        ctx.fillStyle = '#e9d5ff';
        for (let i = 3; i < pl.w - 3; i += 12) {
          ctx.fillRect(pl.x + i, pl.y + 2, 6, pl.h - 4);
        }
        ctx.fillStyle = '#a78bfa';
        ctx.fillRect(pl.x + pl.w / 2 - 2, pl.y - 8, 4, 6);
        ctx.fillRect(pl.x + pl.w / 2 - 6, pl.y - 4, 12, 3);
        ctx.fillRect(pl.x + pl.w / 2 - 2, pl.y + pl.h + 2, 4, 6);
        ctx.fillRect(pl.x + pl.w / 2 - 6, pl.y + pl.h + 2, 12, 3);
      } else {
        ctx.fillStyle = theme.normal;
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        for (let i = 0; i < pl.w; i += 8) {
          ctx.fillStyle = theme.dark;
          ctx.fillRect(pl.x + i, pl.y, 1, pl.h);
        }
        ctx.fillStyle = theme.top;
        for (let i = 0; i < pl.w; i += 4) {
          const grassHeight = 2 + Math.sin(i * 0.1) * 1;
          ctx.fillRect(pl.x + i, pl.y - grassHeight, 3, grassHeight);
        }
      }
    });

    // Finish flag
    const finish = platforms[platforms.length - 1];
    const isSkyKingdom = level.kingdom === 'sky';
    ctx.fillStyle = isSkyKingdom ? '#ffffff' : theme.flagColor;
    ctx.fillRect(finish.x + finish.w / 2 - 3, finish.y - 50, 6, 50);
    ctx.fillStyle = isSkyKingdom ? '#fdba74' : theme.flagColor + 'cc';
    ctx.fillRect(finish.x + finish.w / 2 + 3, finish.y - 50, 24, 16);
    if (isSkyKingdom) {
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(finish.x + finish.w / 2 + 7, finish.y - 46, 10, 4);
    }
    // Coins
    coins.forEach(c => {
      if (c.collected) return;
      const bob = Math.sin(time * 0.08 + c.x) * 3;
      ctx.fillStyle = accent;
      const radius = 8;
      for (let px = -radius; px <= radius; px += 2) {
        for (let py = -radius; py <= radius; py += 2) {
          if (px * px + py * py <= radius * radius) {
            ctx.fillRect(c.x + 8 + px, c.y + 8 + bob + py, 2, 2);
          }
        }
      }
    });

    // Spikes - repeating pattern with serrated edges
    spikes.forEach(s => {
      const spikeTheme = level.kingdom === 'ice'
        ? { fill: '#b3e5fc', stroke: '#7dd3fc', core: '#e0f2fe' }
        : level.kingdom === 'slime'
          ? { fill: '#c084fc', stroke: '#8b5cf6', core: '#e9d5ff' }
          : level.kingdom === 'sky'
            ? { fill: '#fff7ed', stroke: '#fdba74', core: '#ffffff' }
          : level.kingdom === 'magma'
            ? { fill: '#ff7a18', stroke: '#c2410c', core: '#ffd6a5' }
          : { fill: '#7a5c3d', stroke: '#6b5535', core: '#f2d6b3' };
      const spikeWidth = 10;
      for (let i = 0; i < s.w; i += spikeWidth) {
        const sx = s.x + i;
        ctx.fillStyle = spikeTheme.fill;
        ctx.beginPath();
        ctx.moveTo(sx + spikeWidth / 2, s.y);
        ctx.lineTo(sx + spikeWidth, s.y + s.h);
        ctx.lineTo(sx, s.y + s.h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = spikeTheme.stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + spikeWidth / 2, s.y);
        ctx.lineTo(sx + spikeWidth / 2, s.y + s.h);
        ctx.stroke();
        ctx.fillStyle = spikeTheme.core;
        ctx.fillRect(sx + spikeWidth / 2 - 1, s.y + s.h - 4, 2, 3);
      }
    });

    // Obstacles (spinning saw blades)
    obstacles.forEach(obs => {
      const centerX = obs.x + obs.w / 2;
      const centerY = obs.y + obs.h / 2;
      const obstacleTheme = level.kingdom === 'ice'
        ? { blade: '#b3e5fc', edge: '#e0f2fe', core: '#60a5fa', highlight: '#ffffff' }
        : level.kingdom === 'slime'
          ? { blade: '#b47cff', edge: '#7c3aed', core: '#5b21b6', highlight: '#e9d5ff' }
          : level.kingdom === 'sky'
            ? { blade: '#fff7ed', edge: '#fdba74', core: '#fed7aa', highlight: '#ffffff' }
          : level.kingdom === 'magma'
            ? { blade: '#ff6b2c', edge: '#b45309', core: '#7c2d12', highlight: '#ffd6a5' }
          : { blade: '#ff3333', edge: '#cc0000', core: '#991b1b', highlight: '#ff9f9f' };
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((time * 0.15) % (Math.PI * 2));
      
      ctx.fillStyle = obstacleTheme.blade;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 10;
        const y = Math.sin(angle) * 10;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.lineTo(Math.cos(angle + 0.3) * 6, Math.sin(angle + 0.3) * 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = obstacleTheme.edge;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      ctx.fillStyle = obstacleTheme.core;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = obstacleTheme.highlight;
      ctx.fillRect(-2, -2, 2, 2);
      
      ctx.restore();
    });

    // Power-ups (rotating boxes with effects)
    powerups.forEach(pw => {
      if (pw.collected) return;
      
      const bob = Math.sin(time * 0.05 + pw.x) * 4;
      ctx.save();
      ctx.translate(pw.x + pw.w / 2, pw.y + pw.w / 2 + bob);
      ctx.rotate((time * 0.1) % (Math.PI * 2));
      
      let fillColor, strokeColor, accentColor;
      if (pw.type === 'jumpboost') {
        fillColor = '#0066ff';
        strokeColor = '#0044aa';
        accentColor = '#00ccff';
      } else if (pw.type === 'coinmultiplier') {
        fillColor = '#ffff00';
        strokeColor = '#ffaa00';
        accentColor = '#ffdd00';
      } else if (pw.type === 'flymode') {
        fillColor = '#ff0088';
        strokeColor = '#cc0066';
        accentColor = '#ff44bb';
      }
      
      ctx.fillStyle = fillColor;
      ctx.fillRect(-pw.w / 2, -pw.w / 2, pw.w, pw.w);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-pw.w / 2, -pw.w / 2, pw.w, pw.w);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(3, 0);
      ctx.moveTo(0, -3);
      ctx.lineTo(0, 3);
      ctx.stroke();
      
      ctx.restore();
    });

    // Player
    const p = player;
    const cubeSize = 20;
    const cubeY = p.y + 4;
    
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
    
    const leftInput = keys['ArrowLeft'] || keys['a'] || touchLeft;
    const rightInput = keys['ArrowRight'] || keys['d'] || touchRight;
    const inputDir = leftInput && !rightInput ? -1 : rightInput && !leftInput ? 1 : 0;

    drawCube(p.x, cubeY, playerData.selected_cube, {
      inputDir,
      isJumping: !p.grounded && p.vy < 0,
      isMovingHorizontally: Math.abs(p.vx) > 0.2
    });

    // Particles
    particles.forEach(pt => {
      ctx.globalAlpha = pt.life / pt.maxLife;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    });
    ctx.globalAlpha = 1;

    ctx.restore();

    // HUD
    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Coins: ${playerData.total_coins}`, 20, 35);

    // Power-up indicator bars (stacked vertically)
    let powerupRowOffset = 0;
    const powerupRowHeight = 30;
    
    if (jumpBoostActive) {
      const textY = 55 + powerupRowOffset * powerupRowHeight;
      const barY = 65 + powerupRowOffset * powerupRowHeight;
      
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 12px Silkscreen';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ BOOST ⚡', W / 2, textY);
      
      const barWidth = 80;
      const barHeight = 8;
      const barX = W / 2 - barWidth / 2;
      const boostPercent = jumpBoostTimer / 360;
      
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(barX, barY, barWidth * boostPercent, barHeight);
      ctx.strokeStyle = '#00aa00';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      powerupRowOffset++;
    }
    if (coinMultiplierActive) {
      const textY = 55 + powerupRowOffset * powerupRowHeight;
      const barY = 65 + powerupRowOffset * powerupRowHeight;
      
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px Silkscreen';
      ctx.textAlign = 'center';
      ctx.fillText('2x COINS', W / 2, textY);
      
      const barWidth = 80;
      const barHeight = 8;
      const barX = W / 2 - barWidth / 2;
      const multPercent = coinMultiplierTimer / 300;
      
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(barX, barY, barWidth * multPercent, barHeight);
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      powerupRowOffset++;
    }
    if (flyMode) {
      const textY = 55 + powerupRowOffset * powerupRowHeight;
      const barY = 65 + powerupRowOffset * powerupRowHeight;
      
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 12px Silkscreen';
      ctx.textAlign = 'center';
      ctx.fillText('FLY MODE', W / 2, textY);
      
      const barWidth = 80;
      const barHeight = 8;
      const barX = W / 2 - barWidth / 2;
      const flyPercent = flyModeTimer / 360;
      
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#00ccff';
      ctx.fillRect(barX, barY, barWidth * flyPercent, barHeight);
      ctx.strokeStyle = '#0088ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    // Draw home icon for playing state
    drawHomeIcon(homeIconBounds.x + 10, homeIconBounds.y + 10, 36, txt);
  }

  if (state === 'dead') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 40px Silkscreen';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 30);

    ctx.fillStyle = surf;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillText('[ PRESS SPACE OR TAP TO RETRY ]', W / 2, H / 2 + 70);
    ctx.globalAlpha = 1;

    if (keys[' '] || keys['Enter'] || touchJump) {
      keys[' '] = false;
      touchJump = false;
      if (inDailyChallenge) {
        startDailyChallenge(true);
      } else {
        initGame(currentLevel);
      }
    }
        
    // Draw home icon for dead state
    drawHomeIcon(homeIconBounds.x + 10, homeIconBounds.y + 10, 36, txt);
  }

  if (state === 'levelcomplete') {
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 40px Silkscreen';
    ctx.fillText('LEVEL COMPLETE!', W / 2, H / 2 - 30);

    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText(`Time: ${Math.floor(time / 60)}s`, W / 2, H / 2 + 10);

    ctx.fillStyle = surf;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillText('[ SPACE TO NEXT LEVEL ]', W / 2, H / 2 + 70);
    ctx.globalAlpha = 1;

    if (keys[' '] || keys['Enter'] || touchJump) {
      keys[' '] = false;
      keys['Enter'] = false;
      touchJump = false;

      if (inDailyChallenge) {
        const todayDate = getTodayDate();
        const bestDaily = playerData.daily_date === todayDate ? playerData.daily_score : 0;
        const currentTime = Math.floor(time / 60);
        if (currentTime < bestDaily || bestDaily === 0) {
          playerData.daily_score = currentTime;
          playerData.daily_date = todayDate;
        }
        playerData.challenge_points = (playerData.challenge_points || 0) + 20;
        inDailyChallenge = false;
        savePlayerData();
        state = 'menu';
        return;
      }
      
      playerData.total_coins += coins.filter(c => c.collected).length;
      playerData.level_completed = currentLevel + 1;
      savePlayerData();
      
      if (currentLevel < INITIAL_LEVELS.length - 1) {
        initGame(currentLevel + 1);
      } else {
        state = 'menu';
      }
    }
    
    // Draw home icon for levelcomplete state
    drawHomeIcon(homeIconBounds.x + 10, homeIconBounds.y + 10, 36, txt);
    
  }
}

function initGame(levelNum = 0) {
  inDailyChallenge = false;
  currentLevel = levelNum;
  const levelData = generateLevel(levelNum);
  platforms = levelData.platforms.map(p => ({
    ...p,
    oy: p.y,
    crumbleTimer: 0,
    crumbling: false,
    visible: true,
    geyserTimer: p.type === 6 ? (typeof p.geyserTimer === 'number' ? p.geyserTimer : Math.floor((p.x + p.y) % MAGMA_GEYSER_CYCLE)) : 0,
    minY: p.type === 7 ? (typeof p.minY === 'number' ? p.minY : p.y - 40) : p.minY,
    maxY: p.type === 7 ? (typeof p.maxY === 'number' ? p.maxY : p.y + 40) : p.maxY,
    speed: p.type === 7 ? (typeof p.speed === 'number' ? p.speed : 1) : p.speed,
    moveDir: p.type === 7 ? (typeof p.moveDir === 'number' ? p.moveDir : 1) : p.moveDir,
    deltaY: 0
  }));
  coins = levelData.coins ? levelData.coins.map(c => ({...c})) : [];
  spikes = levelData.spikes ? levelData.spikes.map(s => ({...s})) : [];
  obstacles = levelData.obstacles ? levelData.obstacles.map(o => ({...o})) : [];
  powerups = levelData.powerups ? levelData.powerups.map(p => ({...p})) : [];
  player = { x: 50, y: 440, w: 20, h: 28, vx: 0, vy: 0, grounded: false, facing: 1, jumpBuffer: 0, coyoteTime: 0 };
  camera = { x: 0, y: 0 };
  time = 0;
  deathY = 700;
  particles = [];
  lastGroundSurfaceType = 0;
  jumpBoostActive = false;
  jumpBoostTimer = 0;
  coinMultiplierActive = false;
  coinMultiplierTimer = 0;
  flyMode = false;
  flyModeTimer = 0;
  state = 'playing';
}

function startDailyChallenge(silent = false) {
  if (!silent) playClickSound();
  inDailyChallenge = true;
  const seed = getDailyChallengeSeed();
  const levelData = generateDailyLevel(seed);
  platforms = levelData.platforms.map(p => ({
    ...p,
    oy: p.y,
    crumbleTimer: 0,
    crumbling: false,
    visible: true,
    iceSliding: false,
    geyserTimer: p.type === 6 ? (typeof p.geyserTimer === 'number' ? p.geyserTimer : Math.floor((p.x + p.y) % MAGMA_GEYSER_CYCLE)) : 0,
    minY: p.type === 7 ? (typeof p.minY === 'number' ? p.minY : p.y - 40) : p.minY,
    maxY: p.type === 7 ? (typeof p.maxY === 'number' ? p.maxY : p.y + 40) : p.maxY,
    speed: p.type === 7 ? (typeof p.speed === 'number' ? p.speed : 1) : p.speed,
    moveDir: p.type === 7 ? (typeof p.moveDir === 'number' ? p.moveDir : 1) : p.moveDir,
    deltaY: 0
  }));
  coins = levelData.coins ? levelData.coins.map(c => ({ ...c })) : [];
  spikes = levelData.spikes ? levelData.spikes.map(s => ({ ...s })) : [];
  obstacles = levelData.obstacles ? levelData.obstacles.map(o => ({ ...o })) : [];
  powerups = levelData.powerups ? levelData.powerups.map(p => ({ ...p })) : [];
  player = { x: 50, y: 440, w: 20, h: 28, vx: 0, vy: 0, grounded: false, facing: 1, jumpBuffer: 0, coyoteTime: 0 };
  camera = { x: 0, y: 0 };
  time = 0;
  deathY = 700;
  particles = [];
  lastGroundSurfaceType = 0;
  jumpBoostActive = false;
  jumpBoostTimer = 0;
  coinMultiplierActive = false;
  coinMultiplierTimer = 0;
  flyMode = false;
  flyModeTimer = 0;
  bounceCount = 0;
  maxHeightReached = 440;
  levelDeathStreak = 0;
  achievementToast = null;
  state = 'playing';

  // Default music for daily challenge (castle/High Score Run)
  if (musicTrackIndex !== 0) {
    musicTrackIndex = 0;
    playCurrentMusicTrack();
  }
}

// Touch controls
function handleTouches(e) {
  touchLeft = false;
  touchRight = false;
  touchJump = false;
  const rect = canvas.getBoundingClientRect();
  const touches = e.touches;
  for (let i = 0; i < touches.length; i++) {
    const tx = touches[i].clientX - rect.left;
    const ty = touches[i].clientY - rect.top;

    // Don't map home icon touches to movement/jump controls.
    if ((state === 'playing' || state === 'dead' || state === 'levelcomplete') &&
        tx >= homeIconBounds.x && tx <= homeIconBounds.x + homeIconBounds.w &&
        ty >= homeIconBounds.y && ty <= homeIconBounds.y + homeIconBounds.h) {
      return;
    }

    // Gameplay controls use three full-screen zones: left, center, right.
    if (state === 'playing' || state === 'dead' || state === 'levelcomplete') {
      const third = canvas.width / 3;
      if (tx < third) {
        touchLeft = true;
      } else if (tx < third * 2) {
        touchJump = true;
      } else {
        touchRight = true;
      }
      continue;
    }

    // Non-gameplay screens handle taps through buttons; keep a center tap fallback.
    if (ty <= canvas.height) {
      touchJump = true;
    }
  }
}

// Named touch handlers for proper event listener cleanup
const touchStartHandler = (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  if (e.touches.length > 0) {
    touchStartX = e.touches[0].clientX - rect.left;
    touchStartY = e.touches[0].clientY - rect.top;
    lastTouchY = touchStartY;
    isSwipeScrolling = false;
  }
  handleTouches(e);
};

const touchMoveHandler = (e) => {
  e.preventDefault();
  if (e.touches.length > 0 && (state === 'levelselect' || state === 'shop')) {
    const rect = canvas.getBoundingClientRect();
    const ty = e.touches[0].clientY - rect.top;
    const dy = ty - lastTouchY;
    const travel = Math.abs(ty - touchStartY);

    if (travel > 8) {
      isSwipeScrolling = true;
    }

    if (state === 'levelselect') {
      const maxScroll = getLevelSelectMaxScroll();
      levelSelectScrollY = Math.max(0, Math.min(maxScroll, levelSelectScrollY - dy));
    } else {
      const maxScroll = getShopMaxScroll();
      shopScrollY = Math.max(0, Math.min(maxScroll, shopScrollY - dy));
    }

    lastTouchY = ty;
    return;
  }
  handleTouches(e);
};

const touchEndHandler = (e) => {
  e.preventDefault();

  if (e.changedTouches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    const tx = e.changedTouches[0].clientX - rect.left;
    const ty = e.changedTouches[0].clientY - rect.top;

    if (!isSwipeScrolling) {
      if ((state === 'playing' || state === 'dead' || state === 'levelcomplete') &&
          tx >= homeIconBounds.x && tx <= homeIconBounds.x + homeIconBounds.w &&
          ty >= homeIconBounds.y && ty <= homeIconBounds.y + homeIconBounds.h) {
        state = 'menu';
      } else if (state !== 'playing') {
        tryHandleUiTap(tx, ty);
      }
    }
  }

  isSwipeScrolling = false;
  handleTouches(e);
};

// Click handler for home icon
const clickHandler = (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  // Check if click is within home icon bounds
  if (clickX >= homeIconBounds.x && clickX <= homeIconBounds.x + homeIconBounds.w &&
      clickY >= homeIconBounds.y && clickY <= homeIconBounds.y + homeIconBounds.h) {
    // Return to menu if in playing, dead, or levelcomplete states
    if (state === 'playing' || state === 'dead' || state === 'levelcomplete') {
      state = 'menu';
      return;
    }
  }

  if (state !== 'playing') {
    tryHandleUiTap(clickX, clickY);
  }
};

canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
canvas.addEventListener('touchend', touchEndHandler, { passive: false });
canvas.addEventListener('click', clickHandler);

// Optional cleanup function if needed
function cleanupTouchListeners() {
  canvas.removeEventListener('touchstart', touchStartHandler);
  canvas.removeEventListener('touchmove', touchMoveHandler);
  canvas.removeEventListener('touchend', touchEndHandler);
  canvas.removeEventListener('click', clickHandler);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Validate levels before starting
try {
  validateLevels(INITIAL_LEVELS);
  loop();
} catch (e) {
  console.error('Level validation failed:', e.message);
  // Show error on screen
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translate(-50%, -50%)';
  errorDiv.style.padding = '20px';
  errorDiv.style.background = '#b91c1c';
  errorDiv.style.color = '#fff';
  errorDiv.style.zIndex = '10000';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.fontSize = '14px';
  errorDiv.style.borderRadius = '8px';
  errorDiv.style.maxWidth = '500px';
  errorDiv.innerText = `Game Error:\n${e.message}\n\nCheck browser console for details.`;
  document.body.appendChild(errorDiv);
}
