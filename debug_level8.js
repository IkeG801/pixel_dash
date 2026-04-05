// Debug Level 8 elevator issue

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

      if (isElevator) {
        const fallbackX = x > 500 ? x - 140 : x + 140;
        const safeX = Math.max(prevPlatform.x - 130, Math.min(prevPlatform.x + 140, fallbackX));
        platforms.push({ x: safeX, y: y, w: 122, h: 20, type: 0 });
      }

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

const skyLevels = buildSkyLevels();
const level8 = skyLevels[7]; // Index 7 = Level 8

console.log(`Level 8: ${level8.name}`);
console.log(`Total platforms: ${level8.platforms.length}\n`);
console.log('Platform details:');
const sortedPlats = level8.platforms.sort((a, b) => a.y - b.y);
sortedPlats.forEach((p, idx) => {
  const typeNames = {0: 'normal', 2: 'crumble', 7: 'elevator'};
  console.log(`  ${idx}: type=${typeNames[p.type] || p.type} x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} w=${p.w} (x-right: ${(p.x + p.w).toFixed(0)})`);
});

console.log('\nPlatform gaps (top-to-bottom):');
for (let i = 0; i < sortedPlats.length - 1; i++) {
  const curr = sortedPlats[i];
  const next = sortedPlats[i + 1];
  
  const currRight = curr.x + curr.w;
  const nextLeft = next.x;
  const hGap = nextLeft - currRight;
  
  const currTypeNames = {0: 'normal', 2: 'crumble', 7: 'elevator'};
  const nextTypeNames = {0: 'normal', 2: 'crumble', 7: 'elevator'};
  
  console.log(`  ${currTypeNames[curr.type]}(${curr.y.toFixed(0)}) → ${nextTypeNames[next.type]}(${next.y.toFixed(0)}): hGap=${hGap.toFixed(0)}px`);
  if (hGap > 155) {
    console.log(`    ⚠️  TOO LARGE (max 155px allowed)`);
  }
}
