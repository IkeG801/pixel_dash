// Test for gaps that are too small for player movement and spike/obstacle blocking

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
const PLAYER_HEIGHT = 20;
const MIN_PASSAGE = 30;
const MIN_VERTICAL_GAP = 25;

function ensureVerticalClearance(level) {
  if (level.kingdom !== 'sky') return level;
  
  const platforms = level.platforms || [];
  
  const platformsByY = platforms.slice().sort((a, b) => a.y - b.y);
  
  for (let i = 0; i < platformsByY.length; i++) {
    const p1 = platformsByY[i];
    for (let j = i + 1; j < platformsByY.length; j++) {
      const p2 = platformsByY[j];
      
      const overlapStart = Math.max(p1.x, p2.x);
      const overlapEnd = Math.min(p1.x + p1.w, p2.x + p2.w);
      const overlapWidth = overlapEnd - overlapStart;
      
      if (overlapWidth < 10) continue;
      
      const gap = p2.y - (p1.y + p1.h);
      if (gap >= 0 && gap < MIN_VERTICAL_GAP) {
        p2.y = p1.y + p1.h + MIN_VERTICAL_GAP;
      }
    }
  }
  
  return level;
}

function fixSpikeBlocking(level) {
  if (level.kingdom !== 'sky') return level;
  
  const platforms = level.platforms || [];
  const spikes = level.spikes || [];
  
  // Find the main play area bounds
  const minPlatX = Math.min(...platforms.map(p => p.x));
  const maxPlatX = Math.max(...platforms.map(p => p.x + p.w));
  const midX = (minPlatX + maxPlatX) / 2;
  
  // Relocate all spikes to edges (far left or far right) to avoid blocking passages
  spikes.forEach(spike => {
    spike.x = spike.x < midX ? minPlatX - 60 : maxPlatX + 40;
  });
  
  return level;
}

const skyLevels = buildSkyLevels().map(level => 
  ensureVerticalClearance(fixSpikeBlocking(level))
);
console.log(`Testing ${skyLevels.length} Sky levels for blocking gaps and hazards...\n`);

let problemCount = 0;
skyLevels.forEach((level, levelIdx) => {
  const issues = [];
  const plats = level.platforms;
  const spikes = level.spikes || [];
  const obs = level.obstacles || [];
  
  // Check vertical gaps between stacked platforms
  for (let i = 0; i < plats.length; i++) {
    for (let j = 0; j < plats.length; j++) {
      if (i === j) continue;
      
      const p1 = plats[i];
      const p2 = plats[j];
      
      // Check if p2 is directly above p1 (overlap check)
      const overlapX = Math.max(0, Math.min(p1.x + p1.w, p2.x + p2.w) - Math.max(p1.x, p2.x));
      if (overlapX < 10) continue; // No meaningful horizontal overlap
      
      // If p2 is above p1
      if (p2.y < p1.y) {
        const gap = p1.y - (p2.y + p2.h);
        if (gap > 0 && gap < MIN_VERTICAL_GAP) {
          issues.push(`  Vertical gap too small: ${gap.toFixed(0)}px between platforms`);
        }
      }
    }
  }
  
  // Check for spikes blocking main passages
  spikes.forEach(spike => {
    // Find nearby platforms
    const nearbyPlats = plats.filter(p => 
      Math.abs(p.y - spike.y) < 60 && 
      Math.abs(p.x + p.w/2 - (spike.x + spike.w/2)) < 200
    );
    
    // If spike is surrounded by platforms with no clear exit
    if (nearbyPlats.length >= 2) {
      const spikeToPlatGaps = nearbyPlats.map(p => {
        const distLeft = spike.x - (p.x + p.w);
        const distRight = p.x - (spike.x + spike.w);
        return Math.max(distLeft, distRight);
      });
      
      const minGap = Math.min(...spikeToPlatGaps);
      if (minGap < 0 || minGap < MIN_PASSAGE) {
        issues.push(`  Spike at (${spike.x.toFixed(0)}, ${spike.y.toFixed(0)}) blocks passage (gap: ${minGap.toFixed(0)}px)`);
      }
    }
  });
  
  // Check for obstacles blocking critical paths
  obs.forEach(obstacle => {
    const canAvoid = plats.some(p => {
      const sidePathX = p.x > obstacle.x ? p.x - 60 : p.x + p.w + 60;
      return Math.abs(sidePathX - (obstacle.x + obstacle.w/2)) > 80;
    });
    if (!canAvoid) {
      issues.push(`  Obstacle at (${obstacle.x.toFixed(0)}, ${obstacle.y.toFixed(0)}) may block all paths`);
    }
  });
  
  if (issues.length > 0) {
    problemCount++;
    console.log(`Level ${levelIdx + 1}: ${level.name}`);
    issues.forEach(i => console.log(i));
    console.log();
  }
});

console.log(`\n${problemCount}/${skyLevels.length} levels have blocking gaps or hazards.`);
