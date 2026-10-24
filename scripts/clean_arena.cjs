const sharp = require('sharp');
const fs = require('fs');

async function buildCleanArena() {
  const src = 'public/assets/aistudio/C13CA9BE-167F-47A4-AEBC-DD8FBBFE62FE_7ec8339c.png';
  const out = 'public/assets/aistudio/arena_clean_master.png';

  // Extract clean tile patches from pristine areas
  // 1. Clean bottom-left stone paver
  const tile1 = await sharp(src).extract({ left: 300, top: 920, width: 140, height: 100 }).toBuffer();
  // 2. Clean bottom-right stone paver
  const tile2 = await sharp(src).extract({ left: 600, top: 920, width: 140, height: 100 }).toBuffer();
  // 3. Clean center path divider
  const centerPath = await sharp(src).extract({ left: 470, top: 880, width: 80, height: 80 }).toBuffer();
  // 4. Clean top bridge approach stone
  const topStone = await sharp(src).extract({ left: 300, top: 380, width: 120, height: 100 }).toBuffer();

  // Helper to create feathered soft patch
  async function makePatch(buffer, w, h, blur = 5) {
    return await sharp(buffer)
      .resize(w, h, { fit: 'fill' })
      .blur(blur)
      .toBuffer();
  }

  // Patches to cover baked robots, baked lasers, and baked health bars:
  const composites = [];

  // 1. Scout-X on left flank (x: 180..260, y: 670..770)
  const patchScout = await sharp(tile1).resize(100, 110, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchScout, left: 175, top: 670 });

  // 2. Tank-01 center-left (x: 290..420, y: 710..840)
  const patchTank = await sharp(tile1).resize(130, 130, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchTank, left: 290, top: 710 });

  // 3. Med-Bot center (x: 450..560, y: 770..890)
  const patchMedBot = await sharp(centerPath).resize(100, 120, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchMedBot, left: 455, top: 770 });

  // 4. Volt-7 center-right (x: 580..690, y: 740..860)
  const patchVolt = await sharp(tile2).resize(120, 120, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchVolt, left: 580, top: 740 });

  // 5. Omega on right flank (x: 710..810, y: 700..830)
  const patchOmega = await sharp(tile2).resize(110, 130, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchOmega, left: 710, top: 700 });

  // 6. Enemy Red Mecha right bridge (x: 820..910, y: 620..740)
  const patchEnemyRight = await sharp(tile2).resize(90, 120, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchEnemyRight, left: 820, top: 620 });

  // 7. Enemy Red Mecha center-right bridge entrance (x: 630..720, y: 440..550)
  const patchEnemyMidRight = await sharp(tile2).resize(90, 110, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchEnemyMidRight, left: 630, top: 440 });

  // 8. Enemy Smoke cloud (x: 550..640, y: 440..530)
  const patchSmoke = await sharp(tile2).resize(90, 90, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchSmoke, left: 550, top: 440 });

  // 9. Enemy Mecha center-top (x: 400..500, y: 310..430)
  const patchEnemyTop = await sharp(topStone).resize(110, 120, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchEnemyTop, left: 400, top: 310 });

  // 10. Enemy Drone (x: 330..390, y: 260..340)
  const patchDrone = await sharp(topStone).resize(70, 80, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchDrone, left: 330, top: 260 });

  // 11. Enemy Left Tower baked laser line (x: 280..400, y: 220..300)
  const patchLeftLaser = await sharp(topStone).resize(120, 60, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchLeftLaser, left: 280, top: 235 });

  // 12. Enemy Right Tower baked laser line (x: 670..740, y: 220..280)
  const patchRightLaser = await sharp(tile2).resize(70, 60, { fit: 'fill' }).toBuffer();
  composites.push({ input: patchRightLaser, left: 670, top: 225 });

  // Apply composites to master
  await sharp(src)
    .composite(composites)
    .toFile(out);

  console.log('Successfully created arena_clean_master.png');
}

buildCleanArena().catch(console.error);
