// Extract and test Sky level generation

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
    const heightOffset = Math.floor(i * 2.1);
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

// Test levels
function ensurePlayableJumps(level) {
  const maxHorizontalGap = 155;
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

    const isCloseHorizontally = Math.abs(curr.x - prev.x) < 180;
    
    const rise = prev.y - curr.y;
    if (isCloseHorizontally && rise > maxUpwardStep) {
      curr.y = prev.y - maxUpwardStep;
    }

    const drop = curr.y - prev.y;
    if (isCloseHorizontally && drop > maxDownwardStep) {
      curr.y = prev.y + maxDownwardStep;
    }
  }
  return level;
}

const maxHorizontalGap = 155;
const maxUpwardStep = 300;
const maxDownwardStep = 400;

const skyLevels = buildSkyLevels();
console.log(`Testing ${skyLevels.length} Sky levels for impossible jumps...\n`);

let problematicCount = 0;
skyLevels.forEach((level, levelIdx) => {
  const plats = level.platforms.sort((a, b) => a.x - b.x);
  const issues = [];
  
  for (let i = 1; i < plats.length; i++) {
    const prev = plats[i - 1];
    const curr = plats[i];
    
    const hGap = curr.x - (prev.x + prev.w);
    const vDiff = prev.y - curr.y; // positive = going up
    
    if (hGap > maxHorizontalGap) {
      issues.push(`  hGap ${hGap.toFixed(0)} > ${maxHorizontalGap}`);
    }
    if (vDiff > maxUpwardStep) {
      issues.push(`  upward ${vDiff.toFixed(0)} > ${maxUpwardStep}`);
    }
    if (vDiff < -maxDownwardStep) {
      issues.push(`  downward ${(-vDiff).toFixed(0)} > ${maxDownwardStep}`);
    }
  }
  
  if (issues.length > 0) {
    problematicCount++;
    console.log(`Level ${levelIdx + 1}: ${level.name}`);
    issues.forEach(i => console.log(i));
    console.log();
  }
});

console.log(`\n${problematicCount}/${skyLevels.length} levels have playability issues.`);
