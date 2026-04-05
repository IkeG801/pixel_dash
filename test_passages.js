// Test for gaps too small for player to fit through

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
    const heightOffset = Math.floor(i * 0.8);
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

const PLAYER_WIDTH = 20;
const MIN_PASSAGE = 30; // Minimum space to fit player + breathing room

function ensureMinimumPassages(level) {
  if (level.kingdom !== 'sky') return level;
  
  const platforms = level.platforms || [];
  
  // Find all passages and ensure they're wide enough
  for (let i = 0; i < platforms.length; i++) {
    for (let j = i + 1; j < platforms.length; j++) {
      const p1 = platforms[i];
      const p2 = platforms[j];
      
      const heightDiff = Math.abs(p1.y - p2.y);
      if (heightDiff > 80) continue;
      
      const p1Right = p1.x + p1.w;
      const p2Left = p2.x;
      const p1Left = p1.x;
      const p2Right = p2.x + p2.w;
      
      if (p1Right < p2Left) {
        const gap = p2Left - p1Right;
        if (gap > 0 && gap < MIN_PASSAGE) {
          p2.x = p1Right + MIN_PASSAGE;
        }
      } else if (p2Right < p1Left) {
        const gap = p1Left - p2Right;
        if (gap > 0 && gap < MIN_PASSAGE) {
          p1.x = p2Right + MIN_PASSAGE;
        }
      }
    }
  }
  
  return level;
}

const skyLevels = buildSkyLevels().map(level => ensureMinimumPassages(level));
console.log(`Testing ${skyLevels.length} Sky levels for passages too narrow for player...\n`);

let tooNarrowCount = 0;
skyLevels.forEach((level, levelIdx) => {
  const issues = [];
  
  const plats = level.platforms;
  for (let i = 0; i < plats.length; i++) {
    for (let j = i + 1; j < plats.length; j++) {
      const p1 = plats[i];
      const p2 = plats[j];
      
      const heightDiff = Math.abs(p1.y - p2.y);
      if (heightDiff > 80) continue;
      
      const p1Right = p1.x + p1.w;
      const p2Left = p2.x;
      const p1Left = p1.x;
      const p2Right = p2.x + p2.w;
      
      if (p1Right < p2Left) {
        const gap = p2Left - p1Right;
        if (gap < MIN_PASSAGE && gap > 0) {
          issues.push(`  Passage between plat ${i} and ${j}: ${gap.toFixed(0)}px (too narrow)`);
        }
      } else if (p2Right < p1Left) {
        const gap = p1Left - p2Right;
        if (gap < MIN_PASSAGE && gap > 0) {
          issues.push(`  Passage between plat ${i} and ${j}: ${gap.toFixed(0)}px (too narrow)`);
        }
      }
    }
  }
  
  if (issues.length > 0) {
    tooNarrowCount++;
    console.log(`Level ${levelIdx + 1}: ${level.name}`);
    issues.forEach(i => console.log(i));
    console.log();
  }
});

console.log(`\n${tooNarrowCount}/${skyLevels.length} levels have passages too narrow for the player.`);
