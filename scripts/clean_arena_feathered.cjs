const sharp = require('sharp');

async function buildFeatheredCleanArena() {
  const src = 'public/assets/aistudio/C13CA9BE-167F-47A4-AEBC-DD8FBBFE62FE_7ec8339c.png';
  const out = 'public/assets/aistudio/arena_clean_feathered.png';

  // Base stone tile texture from pristine region (bottom-left)
  const baseTile = await sharp(src)
    .extract({ left: 290, top: 920, width: 140, height: 100 })
    .toBuffer();

  // Helper function to create an oval feathered patch
  async function createFeatheredPatch(w, h, feather = 20) {
    const rx = Math.floor(w / 2);
    const ry = Math.floor(h / 2);
    const maskSvg = Buffer.from(
      `<svg width="${w}" height="${h}">
        <defs>
          <filter id="f">
            <feGaussianBlur stdDeviation="${feather}" />
          </filter>
        </defs>
        <ellipse cx="${rx}" cy="${ry}" rx="${rx - feather * 1.5}" ry="${ry - feather * 1.5}" fill="white" filter="url(#f)" />
      </svg>`
    );

    const mask = await sharp(maskSvg).ensureAlpha().toBuffer();

    const patch = await sharp(baseTile)
      .resize(w, h, { fit: 'fill' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    return patch;
  }

  // Define targets to cover smoothly:
  const targets = [
    // Scout-X: (210, 720)
    { x: 160, y: 670, w: 100, h: 100, f: 15 },
    // Tank-01: (350, 770)
    { x: 280, y: 710, w: 140, h: 120, f: 20 },
    // Med-Bot: (500, 840)
    { x: 440, y: 780, w: 120, h: 120, f: 18 },
    // Volt-7: (640, 800)
    { x: 580, y: 740, w: 120, h: 120, f: 18 },
    // Omega: (765, 760)
    { x: 700, y: 700, w: 120, h: 120, f: 18 },
    // Red Mecha right: (860, 680)
    { x: 810, y: 620, w: 110, h: 120, f: 18 },
    // Red Mecha center-right: (670, 480)
    { x: 620, y: 430, w: 100, h: 100, f: 16 },
    // Smoke: (590, 450)
    { x: 550, y: 420, w: 80, h: 80, f: 15 },
    // Red Mecha center-top: (450, 360)
    { x: 390, y: 310, w: 110, h: 110, f: 18 },
    // Red Drone: (360, 290)
    { x: 330, y: 250, w: 80, h: 80, f: 14 },
    // Enemy Left Tower Laser: (330, 260)
    { x: 300, y: 240, w: 100, h: 60, f: 12 },
    // Enemy Right Tower Laser: (700, 250)
    { x: 670, y: 230, w: 80, h: 60, f: 12 },
    // Baked Health Bars:
    // Enemy King HP bar (430..590, 65..95)
    { x: 420, y: 60, w: 180, h: 40, f: 8 },
    // Enemy Left HP bar (210..320, 135..165)
    { x: 200, y: 130, w: 130, h: 36, f: 8 },
    // Enemy Right HP bar (680..790, 135..165)
    { x: 670, y: 130, w: 130, h: 36, f: 8 },
    // Player King HP bar (430..570, 940..980)
    { x: 430, y: 940, w: 140, h: 40, f: 8 },
    // Player Left HP bar (170..280, 970..1010)
    { x: 165, y: 970, w: 125, h: 38, f: 8 },
    // Player Right HP bar (730..840, 970..1010)
    { x: 725, y: 970, w: 125, h: 38, f: 8 },
  ];

  const compositeList = [];
  for (const t of targets) {
    const patch = await createFeatheredPatch(t.w, t.h, t.f);
    compositeList.push({ input: patch, left: t.x, top: t.y });
  }

  await sharp(src)
    .composite(compositeList)
    .toFile(out);

  console.log('Built arena_clean_feathered.png');
}

buildFeatheredCleanArena().catch(console.error);
