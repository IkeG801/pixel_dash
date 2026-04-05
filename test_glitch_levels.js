// Test script to validate Glitch Kingdom level geometry

const INITIAL_LEVELS = [];

// Mock SeededRandom for testing
class SeededRandom {
  constructor(seed = 0) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
}

// Include the buildGlitchLevels function
function buildGlitchLevels() {
  const levels = [];
  const LEVEL_WIDTH = 1200;
  const LEVEL_HEIGHT = 480;
  const STEP_WIDTH = 100;
  const PLATFORM_WIDTH = 122;
  const PLATFORM_HEIGHT = 16;
  const GLITCH_VISIBLE_TIME = 1200;
  const GLITCH_INVISIBLE_TIME = 400;
  
  for (let levelIndex = 0; levelIndex < 15; levelIndex++) {
    const levelNum = levelIndex + 1;
    const platforms = [];
    const obstacles = [];
    const powerups = [];
    const seed = 9000 + levelIndex;
    const rng = new SeededRandom(seed);
    
    const glitchRatio = levelIndex < 3 ? 0.3 : levelIndex < 6 ? 0.45 : levelIndex < 10 ? 0.6 : 0.75;
    const glitchCount = Math.floor(15 * glitchRatio);
    const normalCount = 15 - glitchCount;
    
    // Spawn platform
    platforms.push({
      x: 50,
      y: 440,
      w: PLATFORM_WIDTH,
      h: PLATFORM_HEIGHT,
      type: 0,
      visible: true
    });
    
    let xPos = 150;
    const platformIndices = [];
    for (let i = 0; i < normalCount + glitchCount; i++) {
      const y = 200 + rng.range(-80, 80);
      const isGlitch = i < glitchCount;
      platformIndices.push({ x: xPos, y, isGlitch, idx: i });
      xPos += STEP_WIDTH + rng.range(-20, 40);
    }
    
    let lastX = 50;
    let lastY = 440;
    
    for (let i = 0; i < platformIndices.length; i++) {
      const { x, y, isGlitch } = platformIndices[i];
      const platformType = isGlitch ? 8 : 0;
      
      if (platformType === 0) {
        platforms.push({
          x, y,
          w: PLATFORM_WIDTH,
          h: PLATFORM_HEIGHT,
          type: 0,
          visible: true
        });
      } else {
        const posA = { x: x - 40, y };
        const posB = { x: x + 80, y };
        platforms.push({
          x: posA.x,
          y,
          w: PLATFORM_WIDTH,
          h: PLATFORM_HEIGHT,
          type: 8,
          visible: true,
          posA,
          posB,
          glitchTimer: 0,
          currentPos: 0
        });
      }
      
      lastX = x;
      lastY = y;
    }
    
    platforms.push({
      x: lastX + STEP_WIDTH,
      y: lastY,
      w: PLATFORM_WIDTH,
      h: PLATFORM_HEIGHT,
      type: 0,
      visible: true,
      isFinish: true
    });
    
    const obstacleCount = 2 + Math.floor(levelIndex / 3);
    for (let i = 0; i < obstacleCount; i++) {
      const obstacleIdx = Math.floor(rng.next() * platformIndices.length);
      const { x, y } = platformIndices[Math.min(obstacleIdx, platformIndices.length - 1)];
      
      obstacles.push({
        x: x - 30 + rng.range(-20, 20),
        y: y - 40,
        w: 24,
        h: 24,
        color: '#00ff41',
        vx: (rng.next() - 0.5) * 1.5,
        minX: Math.max(0, x - 150),
        maxX: Math.min(LEVEL_WIDTH, x + 150),
        type: 'spike'
      });
    }
    
    if (levelIndex % 3 === 1) {
      const midPlatform = platformIndices[Math.floor(platformIndices.length / 2)];
      if (midPlatform) {
        powerups.push({
          x: midPlatform.x,
          y: midPlatform.y - 30,
          w: 14,
          h: 14,
          collected: false,
          type: 'jumpboost'
        });
      }
    }
    
    const level = {
      name: `Glitch ${levelNum}`,
      platforms,
      obstacles,
      powerups,
      kingdom: 'glitch'
    };
    
    platforms.length = Math.max(platforms.length, 2);
    levels.push(level);
  }
  
  return levels;
}

// Validation functions
function validateGlitchLevels() {
  const levels = buildGlitchLevels();
  let issues = {
    invalidGlitchPlatforms: [],
    platformGaps: [],
    platformOverlaps: [],
    missingFinish: []
  };
  
  levels.forEach((level, levelIdx) => {
    const levelNum = levelIdx + 1;
    
    // Check for valid glitch platforms
    level.platforms.forEach((pl, plIdx) => {
      if (pl.type === 8) {
        if (!pl.posA || !pl.posB) {
          issues.invalidGlitchPlatforms.push(`Level ${levelNum}: Glitch platform ${plIdx} missing posA or posB`);
        }
        if (typeof pl.currentPos !== 'number' || (pl.currentPos !== 0 && pl.currentPos !== 1)) {
          issues.invalidGlitchPlatforms.push(`Level ${levelNum}: Glitch platform ${plIdx} has invalid currentPos`);
        }
      }
    });
    
    // Check for horizontal gaps (playability)
    const visiblePlatforms = level.platforms.filter(p => p.visible !== false);
    const sortedByX = visiblePlatforms.slice().sort((a, b) => a.x - b.x);
    
    for (let i = 0; i < sortedByX.length - 1; i++) {
      const curr = sortedByX[i];
      const next = sortedByX[i + 1];
      const gap = next.x - (curr.x + curr.w);
      
      // Max jump distance (estimated)
      const maxJump = 200;
      
      if (gap > maxJump && gap < 0 === false) {
        issues.platformGaps.push(`Level ${levelNum}: Large horizontal gap of ${Math.round(gap)}px between platforms`);
      }
    }
    
    // Check for finish platform
    const hasFinish = level.platforms.some(p => p.isFinish);
    if (!hasFinish) {
      issues.missingFinish.push(`Level ${levelNum}: No finish platform`);
    }
  });
  
  return issues;
}

// Run tests
console.log('Testing Glitch Kingdom levels...\n');
const issues = validateGlitchLevels();

let totalIssues = 0;
Object.keys(issues).forEach(category => {
  const count = issues[category].length;
  if (count > 0) {
    console.log(`${category}: ${count} issue(s)`);
    issues[category].forEach(issue => console.log(`  - ${issue}`));
    totalIssues += count;
  }
});

if (totalIssues === 0) {
  console.log('✅ All glitch levels validated successfully!');
  console.log(`✅ 15/15 glitch levels appear playable`);
} else {
  console.log(`\n❌ Found ${totalIssues} issue(s) across glitch levels`);
}
