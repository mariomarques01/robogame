const sharp = require('sharp');

async function testSmooth() {
  const src = 'public/assets/aistudio/C13CA9BE-167F-47A4-AEBC-DD8FBBFE62FE_7ec8339c.png';
  const out = 'public/assets/aistudio/arena_live_bg.png';

  const tileBuffer = await sharp(src)
    .extract({ left: 300, top: 925, width: 130, height: 95 })
    .toBuffer();

  const topTile = await sharp(src)
    .extract({ left: 300, top: 380, width: 120, height: 95 })
    .toBuffer();

  async function makeRadialPatch(tile, w, h) {
    const svg = `
      <svg width="${w}" height="${h}">
        <defs>
          <radialGradient id="g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff" stop-opacity="1" />
            <stop offset="85%" stop-color="#fff" stop-opacity="1" />
            <stop offset="100%" stop-color="#fff" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#g)" />
      </svg>
    `;

    const mask = await sharp(Buffer.from(svg)).toBuffer();

    return await sharp(tile)
      .resize(w, h, { fit: 'fill' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  const targets = [
    // Scout-X near left river bridge (180..260, 480..560)
    { tile: tileBuffer, x: 170, y: 475, w: 120, h: 120 },
    // Scout-X shadow and aura (150..270, 650..780)
    { tile: tileBuffer, x: 150, y: 650, w: 140, h: 140 },
    // Tank-01 Body & Feet (270..420, 700..860)
    { tile: tileBuffer, x: 270, y: 700, w: 170, h: 160 },
    // Green Laser beam between Tank and Med-Bot (350..470, 780..870)
    { tile: tileBuffer, x: 360, y: 770, w: 120, h: 100 },
    // Med-Bot upper body (430..570, 760..870)
    { tile: tileBuffer, x: 430, y: 760, w: 150, h: 130 },
    // Med-Bot legs and shadow (430..570, 850..950)
    { tile: tileBuffer, x: 430, y: 845, w: 150, h: 120 },
    // Volt-7 (570..700, 735..880)
    { tile: tileBuffer, x: 570, y: 735, w: 150, h: 150 },
    // Omega (690..810, 695..830)
    { tile: tileBuffer, x: 695, y: 695, w: 150, h: 150 },
    // Enemy Red Mecha right bridge (800..920, 600..740)
    { tile: tileBuffer, x: 800, y: 600, w: 130, h: 140 },
    // Enemy Red Mecha mid-right (610..720, 440..560)
    { tile: topTile, x: 610, y: 440, w: 130, h: 130 },
    // Smoke (540..630, 410..500)
    { tile: topTile, x: 540, y: 410, w: 100, h: 100 },
    // Enemy Mecha center-top (400..500, 310..430)
    { tile: topTile, x: 390, y: 300, w: 140, h: 140 },
    // Enemy Drone (330..400, 260..340)
    { tile: topTile, x: 330, y: 260, w: 90, h: 90 },
    // Robot on top-right node (710..790, 290..370)
    { tile: topTile, x: 710, y: 290, w: 90, h: 90 },
    // Small enemy gunner top right (620..680, 180..240)
    { tile: topTile, x: 620, y: 175, w: 80, h: 80 },
    // Tower lasers
    { tile: topTile, x: 280, y: 220, w: 120, h: 80 },
    { tile: topTile, x: 660, y: 220, w: 90, h: 80 },
    // Static HP bars
    { tile: topTile, x: 420, y: 55, w: 180, h: 48 },
    { tile: topTile, x: 195, y: 125, w: 140, h: 44 },
    { tile: topTile, x: 665, y: 125, w: 140, h: 44 },
    { tile: tileBuffer, x: 420, y: 935, w: 180, h: 48 },
    { tile: tileBuffer, x: 155, y: 965, w: 140, h: 44 },
    { tile: tileBuffer, x: 715, y: 965, w: 140, h: 44 },
  ];

  const compositeList = [];
  for (const t of targets) {
    const patch = await makeRadialPatch(t.tile, t.w, t.h);
    compositeList.push({ input: patch, left: t.x, top: t.y });
  }

  await sharp(src)
    .composite(compositeList)
    .toFile(out);

  console.log('Successfully refined all arena_live_bg targets!');
}

testSmooth().catch(console.error);
