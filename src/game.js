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

// Load on startup
loadPlayerData();
playerData.challenge_points = (playerData.challenge_points || 0);

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
  const maxUpwardStep = 175;
  const maxDownwardStep = 230;

  const orderedPlatforms = (level.platforms || []).slice().sort((a, b) => a.x - b.x);
  for (let i = 1; i < orderedPlatforms.length; i++) {
    const prev = orderedPlatforms[i - 1];
    const curr = orderedPlatforms[i];

    const prevRight = prev.x + prev.w;
    const gap = curr.x - prevRight;
    if (gap > maxHorizontalGap) {
      curr.x = prevRight + maxHorizontalGap;
    }

    const rise = prev.y - curr.y; // positive means next platform is higher
    if (rise > maxUpwardStep) {
      curr.y = prev.y - maxUpwardStep;
    }

    const drop = curr.y - prev.y; // positive means next platform is lower
    if (drop > maxDownwardStep) {
      curr.y = prev.y + maxDownwardStep;
    }
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

  return ensureSpawnPlatform(ensurePlayableJumps(clonedLevel));
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
  }
];

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
  
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  osc.type = type;
  osc.frequency.value = frequency;
  gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

function playJumpSound() {
  playTone(400, 0.1, 'square', 0.15);
  setTimeout(() => playTone(600, 0.08, 'square', 0.12), 50);
}

function playPowerupSound() {
  playTone(800, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(1000, 0.08, 'sine', 0.15), 50);
}

function playClickSound() {
  playTone(520, 0.05, 'square', 0.1);
}

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
let levelSelectScrollY = 0;
let shopScrollY = 0;

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
  const levelSize = 80;
  const spacing = 20;
  const levelsPerRow = Math.max(1, Math.floor((W - 40) / (levelSize + spacing)));
  const levelRows = Math.ceil(INITIAL_LEVELS.length / levelsPerRow);
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

function update() {
  // Menu navigation
  if (state === 'menu') {
    if (keys['l'] || keys['L']) {
      keys['l'] = false;
      state = 'levelselect';
      selectedLevel = 0;
      levelSelectScrollY = 0;
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
    return;
  }

  if (state === 'levelselect') {
    // Level selection navigation
    if (keys['ArrowUp'] || keys['w']) {
      keys['ArrowUp'] = false;
      keys['w'] = false;
      selectedLevel = Math.max(0, selectedLevel - 1);
      levelSelectScrollY = Math.max(0, levelSelectScrollY - 90);
    }
    if (keys['ArrowDown'] || keys['s']) {
      keys['ArrowDown'] = false;
      keys['s'] = false;
      selectedLevel = Math.min(INITIAL_LEVELS.length - 1, selectedLevel + 1);
      levelSelectScrollY += 90;
    }
    if (keys['ArrowLeft'] || keys['a']) {
      keys['ArrowLeft'] = false;
      keys['a'] = false;
      selectedLevel = Math.max(0, selectedLevel - 1);
    }
    if (keys['ArrowRight'] || keys['d']) {
      keys['ArrowRight'] = false;
      keys['d'] = false;
      selectedLevel = Math.min(INITIAL_LEVELS.length - 1, selectedLevel + 1);
    }

    if (keys[' '] || keys['Enter']) {
      keys[' '] = false;
      keys['Enter'] = false;
      initGame(selectedLevel);
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
    playJumpSound();
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
  
  platforms.forEach(pl => {
    if (!pl.visible) return;
    
    if (rectCollide(p, pl)) {
      const wasAbove = oldY + p.h <= pl.y;
      const wasBelow = oldY >= pl.y + pl.h;
      
      if (wasAbove && p.vy >= 0) {
        p.y = pl.y - p.h;
        p.grounded = true;
        
        if (pl.type === 5) {
          // Slime bounce - super bounce!
          p.vy = JUMP_FORCE * 1.3;
          spawnParticles(p.x + p.w / 2, p.y + p.h, '#00ff00', 8);
        } else {
          p.vy = 0;
        }
        
        if (pl.type === 2 && !pl.crumbling) {
          pl.crumbling = true;
          pl.crumbleTimer = 0;
        }
      } else if (wasBelow && p.vy < 0) {
        p.y = pl.y + pl.h;
        p.vy = 0;
      }
    }
  });

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
      state = 'dead';
      break;
    }
  }

  // Obstacle collision detection (instant death from saw blades)
  for (let i = 0; i < obstacles.length; i++) {
    if (rectCollide(p, obstacles[i])) {
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
      state = 'levelcomplete';
      spawnParticles(p.x + p.w / 2, p.y + p.h / 2, config.primary_action, 30);
    }
  }

  // Death by falling
  if (p.y > deathY) {
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
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

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
    ctx.fillRect(W / 2 - 50, H / 2 + 285, 100, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Silkscreen';
    ctx.fillText('DAILY', W / 2, H / 2 + 310);
    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText('[D]', W / 2, H / 2 + 330);
    registerUiButton(W / 2 - 50, H / 2 + 285, 100, 40, () => {
      startDailyChallenge();
    });

    ctx.fillStyle = txt;
    ctx.font = '12px Silkscreen, Arial, sans-serif';
    const todayDate = getTodayDate();
    const bestDaily = playerData.daily_date === todayDate ? playerData.daily_score : 0;
    const bestText = bestDaily > 0 ? `${bestDaily}s` : '--';
    ctx.fillText(`Daily Best: ${bestText}`, W / 2, H / 2 + 360);

    return;
  }

  if (state === 'levelselect') {
    ctx.textAlign = 'center';
    ctx.fillStyle = surf;
    ctx.font = 'bold 36px Silkscreen';
    ctx.fillText('SELECT LEVEL', W / 2, 80);

    const maxLevels = INITIAL_LEVELS.length;
    const levelSize = 80;
    const spacing = 20;
    const levelsPerRow = Math.floor((W - 40) / (levelSize + spacing));
    const levelRows = Math.ceil(maxLevels / levelsPerRow);
    const contentHeight = levelRows * (levelSize + spacing + 50);
    const visibleHeight = H - 180;
    const maxScroll = Math.max(0, contentHeight - visibleHeight);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 120, W, visibleHeight);
    ctx.clip();

    for (let i = 0; i < maxLevels; i++) {
      const col = i % levelsPerRow;
      const row = Math.floor(i / levelsPerRow);
      const lx = W / 2 - (levelsPerRow * (levelSize + spacing)) / 2 + col * (levelSize + spacing);
      const ly = 140 + row * (levelSize + spacing + 50) - levelSelectScrollY;

      if (ly + levelSize < 120 || ly > H - 60) continue;

      const isSelected = i === selectedLevel;
      const levelData = generateLevel(i);

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

      // Draw level number
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
        initGame(i);
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
    registerUiButton(W / 2 - 60, H - 45, 120, 35, () => initGame(selectedLevel));

    // Back button
    ctx.fillStyle = sec;
    ctx.fillRect(20, H - 45, 60, 35);
    ctx.fillStyle = txt;
    ctx.font = 'bold 11px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText('BACK', 50, H - 20);
    registerUiButton(20, H - 45, 60, 35, () => { state = 'menu'; });
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
    ctx.fillStyle = '#1a3a52';
    ctx.fillRect(0, 0, W, H);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Platforms with type-specific rendering
    platforms.forEach(pl => {
      if (!pl.visible) return;
      
      if (pl.type === 2) {
        // Crumbling platforms - purple stone with cracks
        if (pl.crumbling) {
          ctx.globalAlpha = 1 - pl.crumbleTimer / 30;
        }
        ctx.fillStyle = '#a78baf';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        // Stone texture with vertical lines
        for (let i = 0; i < pl.w; i += 8) {
          ctx.fillStyle = '#8b7b9f';
          ctx.fillRect(pl.x + i, pl.y, 1, pl.h);
        }
        // Jagged cracks (high contrast so they stay visible)
        ctx.strokeStyle = '#3f3350';
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
        // Moss/grass on top
        ctx.fillStyle = '#7cb342';
        for (let i = 0; i < pl.w; i += 4) {
          const grassHeight = 2 + Math.sin(i * 0.1) * 1;
          ctx.fillRect(pl.x + i, pl.y - grassHeight, 3, grassHeight);
        }
        if (pl.crumbling) {
          ctx.globalAlpha = 1;
        }
      } else if (pl.type === 4) {
        // Ice platforms - cyan blue with cracks and shine
        ctx.fillStyle = '#b3e5fc';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        // Ice cracks
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
        // Ice shine effect
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(pl.x + 2, pl.y + 2, pl.w - 4, 4);
      } else if (pl.type === 5) {
        // Slime platforms - lime green, bouncy and wavy
        ctx.fillStyle = '#76ff03';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.strokeStyle = '#64dd17';
        ctx.lineWidth = 2;
        ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
        // Wavy slime texture
        ctx.strokeStyle = '#558b2f';
        ctx.lineWidth = 1;
        for (let i = 0; i < pl.w; i += 8) {
          const waveHeight = Math.sin(i * 0.15 + time * 0.05) * 2;
          ctx.beginPath();
          ctx.moveTo(pl.x + i, pl.y);
          ctx.lineTo(pl.x + i + 4, pl.y - waveHeight);
          ctx.stroke();
        }
        // Slime shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(pl.x + 2, pl.y + 2, pl.w - 4, 3);
      } else {
        // Default/normal platforms (type 0): same stone style as crumbling, but no cracks.
        ctx.fillStyle = '#a78baf';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        for (let i = 0; i < pl.w; i += 8) {
          ctx.fillStyle = '#8b7b9f';
          ctx.fillRect(pl.x + i, pl.y, 1, pl.h);
        }
        ctx.fillStyle = '#7cb342';
        for (let i = 0; i < pl.w; i += 4) {
          const grassHeight = 2 + Math.sin(i * 0.1) * 1;
          ctx.fillRect(pl.x + i, pl.y - grassHeight, 3, grassHeight);
        }
      }
    });

    // Finish flag
    const finish = platforms[platforms.length - 1];
    ctx.fillStyle = accent;
    ctx.fillRect(finish.x + finish.w / 2 - 3, finish.y - 50, 6, 50);
    ctx.fillStyle = accent + 'cc';
    ctx.fillRect(finish.x + finish.w / 2 + 3, finish.y - 50, 24, 16);

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
      ctx.fillStyle = '#7a5c3d';
      const spikeWidth = 10;
      for (let i = 0; i < s.w; i += spikeWidth) {
        const sx = s.x + i;
        ctx.beginPath();
        ctx.moveTo(sx + spikeWidth / 2, s.y);
        ctx.lineTo(sx + spikeWidth, s.y + s.h);
        ctx.lineTo(sx, s.y + s.h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#6b5535';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + spikeWidth / 2, s.y);
        ctx.lineTo(sx + spikeWidth / 2, s.y + s.h);
        ctx.stroke();
      }
    });

    // Obstacles (spinning saw blades)
    obstacles.forEach(obs => {
      const centerX = obs.x + obs.w / 2;
      const centerY = obs.y + obs.h / 2;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((time * 0.15) % (Math.PI * 2));
      
      ctx.fillStyle = '#ff3333';
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
      }
      
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(-4, -4, 8, 8);
      
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
  platforms = levelData.platforms.map(p => ({...p, oy: p.y, crumbleTimer: 0, crumbling: false, visible: true}));
  coins = levelData.coins ? levelData.coins.map(c => ({...c})) : [];
  spikes = levelData.spikes ? levelData.spikes.map(s => ({...s})) : [];
  obstacles = levelData.obstacles ? levelData.obstacles.map(o => ({...o})) : [];
  powerups = levelData.powerups ? levelData.powerups.map(p => ({...p})) : [];
  player = { x: 50, y: 440, w: 20, h: 28, vx: 0, vy: 0, grounded: false, facing: 1, jumpBuffer: 0, coyoteTime: 0 };
  camera = { x: 0, y: 0 };
  time = 0;
  deathY = 700;
  particles = [];
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
  platforms = levelData.platforms.map(p => ({ ...p, oy: p.y, crumbleTimer: 0, crumbling: false, visible: true, iceSliding: false }));
  coins = levelData.coins ? levelData.coins.map(c => ({ ...c })) : [];
  spikes = levelData.spikes ? levelData.spikes.map(s => ({ ...s })) : [];
  obstacles = levelData.obstacles ? levelData.obstacles.map(o => ({ ...o })) : [];
  powerups = levelData.powerups ? levelData.powerups.map(p => ({ ...p })) : [];
  player = { x: 50, y: 440, w: 20, h: 28, vx: 0, vy: 0, grounded: false, facing: 1, jumpBuffer: 0, coyoteTime: 0 };
  camera = { x: 0, y: 0 };
  time = 0;
  deathY = 700;
  particles = [];
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
