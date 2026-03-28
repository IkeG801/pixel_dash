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
    const parsed = JSON.parse(saved);
    playerData = { ...playerData, ...parsed };
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

// Game constants (declared in game-logic.js and available globally)
// const TILE = 32;              // from game-logic.js
// const GRAVITY = 0.6;          // from game-logic.js
// const JUMP_FORCE = -12;       // from game-logic.js
// const MOVE_SPEED = 4.5;       // from game-logic.js
// const FRICTION = 0.85;        // from game-logic.js

// Generate level - just returns from INITIAL_LEVELS
function generateLevel(levelNum) {
  if (levelNum < INITIAL_LEVELS.length) {
    return INITIAL_LEVELS[levelNum];
  }
  // If we run out of levels, just loop back to start
  return INITIAL_LEVELS[levelNum % INITIAL_LEVELS.length];
}

// Level definitions - initial curated levels (abbreviated - see original file for full list)
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
  }
];

// Add placeholder levels 3..13 if not provided by original data
typeof Array.prototype.fill === 'function';

function createAutoLevel(levelIndex) {
  const levelNum = levelIndex + 1;
  const horizontalShift = levelIndex * 28;
  const verticalShift = levelIndex * 8;

  const baseY = 520 - verticalShift;
  const gapX = 170;
  const platformCount = 4 + (levelIndex % 3);

  const platforms = [];
  for (let j = 0; j < platformCount; j++) {
    const x = j * gapX + horizontalShift;
    const y = baseY - j * 40 - Math.max(0, levelIndex - 2) * 4;
    platforms.push({ x, y, w: 100 + (j % 3) * 30, h: 20, type: (j % 4 === 0 ? 0 : (j % 4 === 1 ? 4 : (j % 4 === 2 ? 5 : 4))) });
  }

  const spikes = [];
  const coins = [];
  const powerups = [];

  for (let j = 0; j < platforms.length; j++) {
    if (j % 2 === 0) {
      spikes.push({ x: platforms[j].x + 60, y: platforms[j].y + 20, w: 40, h: 16, type: 0 });
    }
    coins.push({ x: platforms[j].x + platforms[j].w / 2 - 8, y: platforms[j].y - 36, w: 16, h: 16, collected: false });
    if (j === platforms.length - 1) {
      powerups.push({ x: platforms[j].x + 40, y: platforms[j].y - 36, w: 14, h: 14, collected: false, type: 'jumpboost' });
    }
  }

  const obstacles = [];
  if (levelIndex % 3 === 0) {
    obstacles.push({ x: 450 + horizontalShift, y: baseY - 120, w: 26, h: 26, vx: 2 + levelIndex * 0.2, minX: 420 + horizontalShift, maxX: 560 + horizontalShift, type: 'spike' });
  }

  return {
    name: `Level ${levelNum} - Expedition`,
    platforms,
    spikes,
    coins,
    obstacles,
    powerups
  };
}

for (let i = INITIAL_LEVELS.length; i < 13; i++) {
  INITIAL_LEVELS.push(createAutoLevel(i));
}

// Particle system
let particles = [];
function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 1) * 5,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 2 + Math.random() * 3,
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
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

// Game state
let state = 'menu';
let player, platforms, coins, spikes, camera, score, time, deathY, currentLevel, obstacles, powerups;

// Menu navigation state
let selectedLevel = 0;
let levelSelectScrollY = 0;
let shopScrollY = 0;

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
        } else {
          if (playerData.total_coins >= selectedSkin.price) {
            playerData.total_coins -= selectedSkin.price;
            playerData.owned_cubes += ',' + playerData.selected_cube;
            savePlayerData();
          }
        }
      } else {
        // Already own, just select it
        savePlayerData();
      }
    }
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
  p.vx *= FRICTION;
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
        p.vy = 0;
        
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
      playerData.total_coins += 10;
      spawnParticles(c.x + 8, c.y + 8, config.primary_action, 8);
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

  // Death
  if (p.y > deathY) {
    state = 'dead';
  }

  // Camera
  camera.x += (p.x - canvas.width / 3 - camera.x) * 0.08;
  camera.y += (p.y - canvas.height / 2 - camera.y) * 0.05;
  if (camera.x < 0) camera.x = 0;

  // Particles
  particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.life--; });
  particles = particles.filter(pt => pt.life > 0);
}

function drawCube(x, y, skinKey) {
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
    // Eyes
    const eyeY = faceY + 5;
    const eyeSpacing = 5;
    const leftEyeX = faceX + eyeSpacing;
    const rightEyeX = faceX + faceSize - eyeSpacing - 2;
    const eyeSize = 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(leftEyeX, eyeY, eyeSize, eyeSize);
    ctx.fillRect(rightEyeX, eyeY, eyeSize, eyeSize);
    
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

let drawFrameCount = 0;
function draw() {
  if (drawFrameCount === 0) {
    console.log('Pixel Dash draw() called, initial state:', state); 
  }
  drawFrameCount++;

  const W = canvas.width, H = canvas.height;
  const bg = config.background_color || defaultConfig.background_color;
  const surf = config.surface_color || defaultConfig.surface_color;
  const txt = config.text_color || defaultConfig.text_color;
  const accent = config.primary_action || defaultConfig.primary_action;
  const sec = config.secondary_action || defaultConfig.secondary_action;
  const title = config.game_title || defaultConfig.game_title;

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

    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 + 30, H / 2 + 220, 100, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText('SHOP', W / 2 + 80, H / 2 + 245);
    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen, Arial, sans-serif';
    ctx.fillText('[S]', W / 2 + 80, H / 2 + 265);

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

    // Back button
    ctx.fillStyle = sec;
    ctx.fillRect(20, H - 45, 60, 35);
    ctx.fillStyle = txt;
    ctx.font = 'bold 11px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText('BACK', 50, H - 20);
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
    });

    ctx.restore();

    // Back button
    ctx.fillStyle = sec;
    ctx.fillRect(W / 2 - 70, H - 60, 140, 40);
    ctx.fillStyle = txt;
    ctx.font = 'bold 14px Silkscreen';
    ctx.fillText('[ SPACE TO BACK ]', W / 2, H - 35);

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

    // Platforms
    platforms.forEach(pl => {
      if (!pl.visible) return;
      ctx.fillStyle = '#a78baf';
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.strokeStyle = '#8b7b9f';
      ctx.lineWidth = 2;
      ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
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

    // Player
    const p = player;
    const cubeSize = 20;
    const cubeY = p.y + 4;
    
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
    
    drawCube(p.x, cubeY, playerData.selected_cube);

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
      initGame(currentLevel);
    }
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
      
      playerData.total_coins += coins.filter(c => c.collected).length;
      playerData.level_completed = currentLevel + 1;
      savePlayerData();
      
      if (currentLevel < INITIAL_LEVELS.length - 1) {
        initGame(currentLevel + 1);
      } else {
        state = 'menu';
      }
    }
  }
}

function initGame(levelNum = 0) {
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
  state = 'playing';
}

// Touch controls
function handleTouches(e) {
  touchLeft = false;
  touchRight = false;
  touchJump = false;
  const touches = e.touches;
  for (let i = 0; i < touches.length; i++) {
    const tx = touches[i].clientX;
    const ty = touches[i].clientY;
    const third = canvas.width / 3;
    if (ty > canvas.height - 120) {
      if (tx < third) touchLeft = true;
      else if (tx < third * 2) touchRight = true;
      else touchJump = true;
    } else {
      touchJump = true;
    }
  }
}

canvas.addEventListener('touchstart', e => { e.preventDefault(); handleTouches(e); }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); handleTouches(e); }, { passive: false });
canvas.addEventListener('touchend', e => { e.preventDefault(); handleTouches(e); }, { passive: false });

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
