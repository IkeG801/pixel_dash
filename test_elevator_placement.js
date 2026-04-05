// Test elevator placement for level impossibility

function buildSkyLevels() {
  const skyNames = [
    'Cloudstep Start', 'Morning Lift', 'Featherline', 'Rose Horizon', 'Sunwake Rungs',
    'High Drift', 'Dawn Rails', 'Pastel Updraft', 'Skyline Pulse', 'Cirrus Ladder',
    'Halo Transit', 'Silver Wake', 'Zenith Liftway', 'Above the Amber', 'Seven Thousand Feet'
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
    let elevatorSteps = [];

    for (let step = 1; step <= 8; step++) {
      const y = baseY - step * 66 - heightOffset;

      const laneDelta = ((step + i) % 4 === 0) ? 1 : (((step + i) % 5 === 0) ? -1 : 0);
      lane = Math.max(0, Math.min(laneX.length - 1, lane + laneDelta));

      let x = laneX[lane] + ((i % 3) - 1) * 8;
      x = Math.max(prevPlatform.x - 130, Math.min(prevPlatform.x + 140, x));

      const isElevator = step === 3 || (step === 6 && i >= 5);
      const isCrumble = step === 5 || (step === 7 && i >= 10);
      const type = isElevator ? 7 : (isCrumble ? 2 : 0);
      const width = 122;

      const platform = { x, y, w: width, h: 20, type };
      if (type === 7) {
        const amp = i >= 10 ? 30 : 24;
        platform.minY = y - amp;
        platform.maxY = y + amp;
        platform.speed = 0.55 + (i % 4) * 0.1;
        platform.moveDir = ((i + step) % 2 === 0) ? 1 : -1;
        elevatorSteps.push(step);
      }
      platforms.push(platform);

      coins.push({ x: x + Math.floor(width / 2) - 8, y: y - 34, w: 16, h: 16, collected: false });

      if (step % 3 === 0) {
        const sideX = x + width + 16;
        spikes.push({ x: sideX, y: y + 20, w: 26, h: 16, type: 0 });
      }

      prevPlatform = platform;
    }

    // Add safety platforms after each elevator at the next step height
    for (const elevStep of elevatorSteps) {
      const nextStep = elevStep + 1;
      if (nextStep <= 8) {
        const nextY = baseY - nextStep * 66 - heightOffset;
        const nextLane = 1 + ((nextStep + i) % 2);
        const nextX = laneX[Math.max(0, Math.min(4, nextLane))];
        platforms.push({ x: nextX, y: nextY, w: 122, h: 20, type: 0 });
      }
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

const skyLevels = buildSkyLevels();
console.log(`Analyzing elevator placement in ${skyLevels.length} Sky levels...\n`);

let problematicCount = 0;
skyLevels.forEach((level, levelIdx) => {
  const issues = [];
  const plats = level.platforms;
  
  // Find elevators (type 7)
  const elevators = plats.filter(p => p.type === 7);
  
  if (elevators.length === 0) {
    console.log(`Level ${levelIdx + 1}: ${level.name} - No elevators`);
    return;
  }
  
  // Check if elevator is wider than needed (width 106 vs normal 122)
  // and if elevator is the only platform at that height
  elevators.forEach(elev => {
    const nearbyPlats = plats.filter(p => p !== elev && Math.abs(p.y - elev.y) < 30);
    
    if (nearbyPlats.length === 0) {
      issues.push(`  Elevator at (${elev.x.toFixed(0)}, ${elev.y.toFixed(0)}) is only platform at this height - may be impossible to reach next level`);
    }
    
    // Check if elevator is narrower and harder to land on
    const normalWidth = 122;
    const elevWidth = 106;
    if (elev.w === elevWidth && elevWidth < normalWidth) {
      // Check next platform reachability
      const nextUp = plats.filter(p => p.y < elev.y && p !== elev).sort((a, b) => b.y - a.y)[0];
      if (nextUp) {
        const hGap = Math.abs(nextUp.x - (elev.x + elev.w/2));
        if (hGap > 155) {
          issues.push(`  Elevator at step may create unreachable gap to next platform (${hGap.toFixed(0)}px)`);
        }
      }
    }
  });
  
  // Check elevator movement range - if elevator moves too much, it could move into walls or other platforms
  elevators.forEach(elev => {
    if (!elev.minY || !elev.maxY) return;
    
    const range = elev.maxY - elev.minY;
    if (range > 60) {
      // Large movement range might interfere with level geometry
      const overlappingPlats = plats.filter(p => 
        p !== elev && 
        Math.max(0, Math.min(p.x + p.w, elev.x + elev.w) - Math.max(p.x, elev.x)) > 10 &&
        ((p.y + p.h > elev.minY && p.y < elev.maxY) || (p.y + p.h > elev.y - 5 && p.y < elev.y + 5))
      );
      
      if (overlappingPlats.length > 0) {
        issues.push(`  Elevator movement range ${range.toFixed(0)}px may interfere with nearby platforms`);
      }
    }
  });

  if (issues.length > 0) {
    problematicCount++;
    console.log(`Level ${levelIdx + 1}: ${level.name}`);
    issues.forEach(i => console.log(i));
    console.log();
  }
});

console.log(`\n${problematicCount}/${skyLevels.length} levels have elevator placement issues.`);
