// Analyze actual reachability for Level 8

function buildLevel8() {
  const laneX = [220, 370, 520, 670, 820];
  const i = 7; // Level 8 (0-indexed)
  const baseY = 500;
  const heightOffset = Math.floor(i * 0.8); // = 5

  const platforms = [{ x: 0, y: 500, w: 170, h: 20, type: 0 }];
  const elevatorSteps = [];
  let prevPlatform = { x: 0, y: 500, w: 170 };
  let lane = 1 + (i % 2); // = 2

  for (let step = 1; step <= 8; step++) {
    const y = baseY - step * 66 - heightOffset;

    const laneDelta = ((step + i) % 4 === 0) ? 1 : (((step + i) % 5 === 0) ? -1 : 0);
    lane = Math.max(0, Math.min(laneX.length - 1, lane + laneDelta));

    let x = laneX[lane] + ((i % 3) - 1) * 8;
    x = Math.max(prevPlatform.x - 155, Math.min(prevPlatform.x + 155, x));  // Increased for better connectivity

    const isElevator = step === 3;
    const isCrumble = step === 5 || (step === 7 && i >= 10);
    const type = isElevator ? 7 : (isCrumble ? 2 : 0);
    const width = 122;

    const platform = { x, y, w: width, h: 20, type, step };
    if (type === 7) {
      const amp = i >= 10 ? 30 : 24;
      platform.minY = y - amp;
      platform.maxY = y + amp;
      elevatorSteps.push(step);
    }
    platforms.push(platform);

    prevPlatform = platform;
    
    console.log(`Step ${step}: ${type === 7 ? 'ELEVATOR' : type === 2 ? 'CRUMBLE' : 'NORMAL'} at y=${y} x=${x}-${x+width} lane=${lane}`);
  }

  // Add safety platforms
  for (const elevStep of elevatorSteps) {
    const nextStep = elevStep + 1;
    if (nextStep <= 8) {
      const elevatorPlat = platforms.find(p => p.type === 7 && 
        Math.abs(p.y - (baseY - elevStep * 66 - heightOffset)) < 1);
      
      if (elevatorPlat) {
        const nextY = baseY - nextStep * 66 - heightOffset;
        const nextX = Math.max(prevPlatform.x - 130, Math.min(prevPlatform.x + 140, elevatorPlat.x));
        platforms.push({ x: nextX, y: nextY, w: 122, h: 20, type: 0, isSafety: true, step: nextStep });
        console.log(`Safety platform after elevator at step ${elevStep}: y=${nextY} x=${nextX}-${nextX+122}`);
      }
    }
  }

  const finish = { x: 520, y: 72, w: 240, h: 40, type: 0 };
  platforms.push(finish);

  return platforms;
}

const PLAYER_WIDTH = 20;
const MAX_JUMP = 155; // Max horizontal distance
const platforms = buildLevel8();

console.log('\n=== Connectivity Analysis ===\n');

// Check each pair for reachability
for (let i = 0; i < platforms.length - 1; i++) {
  for (let j = i + 1; j < platforms.length; j++) {
    const p1 = platforms[i];
    const p2 = platforms[j];
    
    // Only check upward jumps
    if (p2.y >= p1.y) continue;
    
    const vGap = p1.y - (p2.y + 20);  // p1 bottom to p2 top
    const hGap = Math.min(
      Math.abs(p1.x - p2.x),           // left-to-left
      Math.abs(p1.x + p1.w - (p2.x + p2.w)) // right-to-right
    );
    
    const overlapX = Math.max(0, Math.min(p1.x + p1.w, p2.x + p2.w) - Math.max(p1.x, p2.x));
    const reachable = overlapX > 0 || hGap < MAX_JUMP;
    
    if (!reachable) {
      console.log(`❌ UNREACHABLE: step ${p1.step || '?'} (${p1.type===7?'ELEV':p1.type===2?'CRUMB':'NORM'}) → step ${p2.step || '?'}`);
      console.log(`   p1: y=${p1.y} x=${p1.x}-${p1.x+p1.w}`);
      console.log(`   p2: y=${p2.y} x=${p2.x}-${p2.x+p2.w}`);
      console.log(`   vGap=${vGap.toFixed(0)}, hGap=${hGap.toFixed(0)}, overlapX=${overlapX.toFixed(0)}\n`);
    }
  }
}
