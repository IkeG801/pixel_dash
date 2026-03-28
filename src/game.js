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

// Initialize player data from localStorage
function loadPlayerData() {
  const saved = localStorage.getItem('pixelDashPlayer');
  if (saved) {
    const parsed = JSON.parse(saved);
    playerData = { ...playerData, ...parsed };
  }
}

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

// Game constants
const TILE = 32;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4.5;
const FRICTION = 0.85;

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

// Cube skins (abbreviated - see original for full list)
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

score = 0;

// Collision
function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
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
  
  ctx.fillStyle = skin.bodyColor;
  ctx.fillRect(x, y, cubeSize, cubeSize);
  ctx.strokeStyle = skin.bodyStroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, cubeSize, cubeSize);
  
  const faceX = x + 2;
  const faceY = y + 2;
  const faceSize = 16;
  
  ctx.fillStyle = skin.faceColor;
  ctx.fillRect(faceX, faceY, faceSize, faceSize);
  ctx.strokeStyle = skin.faceStroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(faceX, faceY, faceSize, faceSize);
  
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
  
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 1, y + 1, 6, 6);
}

function draw() {
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
    ctx.font = 'bold 48px Silkscreen';
    ctx.fillText(title, W / 2, H / 2 - 100);

    ctx.fillStyle = txt;
    ctx.font = '14px Silkscreen';
    ctx.textAlign = 'center';
    ctx.fillText('Arrow keys or WASD to move', W / 2, H / 2 + 50);
    ctx.fillText('Up / W / Space to jump', W / 2, H / 2 + 80);

    ctx.fillStyle = sec;
    ctx.font = 'bold 20px Silkscreen';
    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillText('[ PRESS SPACE OR TAP TO START ]', W / 2, H / 2 + 160);
    ctx.globalAlpha = 1;

    if (keys[' '] || keys['Enter'] || touchJump) {
      keys[' '] = false;
      touchJump = false;
      initGame(0);
    }
    return;
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
    ctx.font = '14px Silkscreen';
    ctx.textAlign = 'left';
    ctx.fillText(`Coins: ${playerData.total_coins}`, 20, 35);
  }

  if (state === 'dead') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 40px Silkscreen';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 30);

    ctx.fillStyle = surf;
    ctx.font = '16px Silkscreen';
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
    ctx.font = '18px Silkscreen';
    ctx.fillText(`Time: ${Math.floor(time / 60)}s`, W / 2, H / 2 + 10);

    ctx.fillStyle = surf;
    ctx.font = '16px Silkscreen';
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
