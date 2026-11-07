import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(len + 12);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, len + 8);
  chunk.writeUInt32BE(crc32(typeAndData), len + 8);
  return chunk;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rowBytes = width * 4;
  const rawScanlines = Buffer.alloc(height * (rowBytes + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawScanlines[rowOffset] = 0; // Filter None
    rgbaBuffer.copy(rawScanlines, rowOffset + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  // IDAT
  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Procedural rasterizer for Depend Sourcing Ltd. Brand Mark
 * @param {number} size
 * @param {boolean} isMaskable
 */
function renderDependSourcingIcon(size, isMaskable) {
  const rgba = Buffer.alloc(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 512;

  // Background
  for (let y = 0; y < size; y++) {
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const idx = (y * size + x) * 4;

      // Squircle corner check for non-maskable icons
      if (!isMaskable) {
        const cornerRadius = 96 * scale;
        let inBounds = true;
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        const half = size / 2;
        if (dx > half - cornerRadius && dy > half - cornerRadius) {
          const cornerDist = Math.hypot(dx - (half - cornerRadius), dy - (half - cornerRadius));
          if (cornerDist > cornerRadius) {
            inBounds = false;
          }
        }
        if (!inBounds) {
          rgba[idx] = 0;
          rgba[idx + 1] = 0;
          rgba[idx + 2] = 0;
          rgba[idx + 3] = 0;
          continue;
        }
      }

      // Rich Deep Midnight Navy Gradient (#0F172A to #0B192C to #071322)
      const grad = (nx * 0.4 + ny * 0.6);
      const r = Math.round(15 * (1 - grad) + 7 * grad);
      const g = Math.round(25 * (1 - grad) + 18 * grad);
      const b = Math.round(44 * (1 - grad) + 36 * grad);

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = 255;

      // Soft ambient radial glow in upper-center (Cyan-Blue illumination)
      const lightDx = x - (cx - 20 * scale);
      const lightDy = y - (cy - 40 * scale);
      const lightDist = Math.hypot(lightDx, lightDy);
      if (lightDist < 160 * scale) {
        const glowFactor = Math.pow(1 - lightDist / (160 * scale), 2) * 0.35;
        rgba[idx] = Math.min(255, Math.round(rgba[idx] + 37 * glowFactor));
        rgba[idx + 1] = Math.min(255, Math.round(rgba[idx + 1] + 99 * glowFactor));
        rgba[idx + 2] = Math.min(255, Math.round(rgba[idx + 2] + 235 * glowFactor));
      }
    }
  }

  // Draw Shield Contour & Monogram
  const emblemScale = isMaskable ? 0.72 : 0.88;
  const offX = cx;
  const offY = cy - 10 * scale;

  function toLocal(px, py) {
    return {
      x: (px - offX) / (scale * emblemScale) + 256,
      y: (py - offY) / (scale * emblemScale) + 256,
    };
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (rgba[idx + 3] === 0) continue; // transparent pixel

      const { x: lx, y: ly } = toLocal(x, y);

      // 1. Shield Boundary Outline
      // Approximate shield points: (256, 75) down to (370, 135) to (370, 270) to (256, 400) to (142, 270) to (142, 135)
      let inShieldEdge = false;
      if (ly >= 90 && ly <= 390 && lx >= 145 && lx <= 367) {
        let expectedHalfWidth = 110;
        if (ly < 140) {
          expectedHalfWidth = 110 * ((ly - 80) / 60);
        } else if (ly > 270) {
          expectedHalfWidth = 110 * (1 - Math.pow((ly - 270) / 120, 1.4));
        }
        const distFromCenter = Math.abs(lx - 256);
        if (Math.abs(distFromCenter - expectedHalfWidth) < 3.5) {
          inShieldEdge = true;
        }
      }

      if (inShieldEdge) {
        // Cyan rim accent
        rgba[idx] = Math.min(255, rgba[idx] + 56);
        rgba[idx + 1] = Math.min(255, rgba[idx + 1] + 189);
        rgba[idx + 2] = Math.min(255, rgba[idx + 2] + 248);
      }

      // 2. 'D' Shape: Vertical stem x in [176, 216], y in [150, 345]
      // Curved bowl from (216, 150) curving out to x=325 at y=225, back to (216, 300)
      let inDStem = (lx >= 180 && lx <= 218 && ly >= 155 && ly <= 345);
      let inDBase = (lx >= 180 && lx <= 250 && ly >= 295 && ly <= 345);
      let inDBowl = false;

      if (lx >= 216 && lx <= 330 && ly >= 155 && ly <= 300) {
        const dyBowl = (ly - 227) / 72;
        const outerBowlX = 216 + 110 * Math.sqrt(Math.max(0, 1 - dyBowl * dyBowl));
        const innerBowlX = 216 + 68 * Math.sqrt(Math.max(0, 1 - dyBowl * dyBowl));
        if (lx <= outerBowlX && lx >= innerBowlX) {
          inDBowl = true;
        }
      }

      if (inDStem || inDBase || inDBowl) {
        // Brilliant Royal/Electric Cyan Gradient (#38BDF8 to #2563EB)
        const t = (ly - 155) / 190;
        const dr = Math.round(56 * (1 - t) + 29 * t);
        const dg = Math.round(189 * (1 - t) + 78 * t);
        const db = Math.round(248 * (1 - t) + 216 * t);

        rgba[idx] = dr;
        rgba[idx + 1] = dg;
        rgba[idx + 2] = db;
      }

      // 3. 'S' Ribbon Wave (Interlocking through center and bowl)
      // Flows from top right (310, 175) down-left to (235, 230) down-right to (290, 290) to (195, 335)
      let inSRibbon = false;
      // Top curve
      if (ly >= 165 && ly <= 220 && lx >= 240 && lx <= 315) {
        const curveY = 175 + Math.sin((lx - 240) / 75 * Math.PI) * 20;
        if (Math.abs(ly - curveY) < 14) inSRibbon = true;
      }
      // Diagonal mid slash
      if (ly >= 210 && ly <= 270 && lx >= 225 && lx <= 295) {
        const expectedX = 295 - ((ly - 210) / 60) * 65;
        if (Math.abs(lx - expectedX) < 16) inSRibbon = true;
      }
      // Bottom curve
      if (ly >= 265 && ly <= 335 && lx >= 195 && lx <= 290) {
        const curveY = 320 - Math.sin((lx - 195) / 95 * Math.PI) * 20;
        if (Math.abs(ly - curveY) < 14) inSRibbon = true;
      }

      if (inSRibbon) {
        // Emerald-Cyan ribbon (#34D399 to #06B6D4)
        const st = (ly - 165) / 170;
        const sr = Math.round(52 * (1 - st) + 6 * st);
        const sg = Math.round(211 * (1 - st) + 182 * st);
        const sb = Math.round(153 * (1 - st) + 212 * st);

        rgba[idx] = sr;
        rgba[idx + 1] = sg;
        rgba[idx + 2] = sb;
      }

      // 4. Gold Sparkle Star (Diamond star at top-right: 365, 135)
      const starDx = Math.abs(lx - 365);
      const starDy = Math.abs(ly - 135);
      if ((starDx + starDy * 2 < 18) || (starDx * 2 + starDy < 18)) {
        rgba[idx] = 253; // #FDE047 Gold
        rgba[idx + 1] = 224;
        rgba[idx + 2] = 71;
      }

      // 5. Emerald dot at bottom stem
      if (Math.hypot(lx - 216, ly - 345) < 7) {
        rgba[idx] = 52;
        rgba[idx + 1] = 211;
        rgba[idx + 2] = 153;
      }
    }
  }

  // Draw Bottom Brand Bar (Clean crisp pill with "DEPEND SOURCING")
  const barY = Math.round(size * (isMaskable ? 0.78 : 0.82));
  const barH = Math.round(size * 0.07);
  const barW = Math.round(size * (isMaskable ? 0.64 : 0.74));
  const barX = Math.round((size - barW) / 2);

  for (let y = barY; y < barY + barH; y++) {
    for (let x = barX; x < barX + barW; x++) {
      const idx = (y * size + x) * 4;
      if (rgba[idx + 3] === 0) continue;

      // Pill shape boundary
      const pR = barH / 2;
      const pdx = Math.max(0, Math.abs(x - (barX + barW / 2)) - (barW / 2 - pR));
      const pdy = Math.abs(y - (barY + barH / 2));
      if (Math.hypot(pdx, pdy) <= pR) {
        // Deep Indigo/Navy fill with Cyan border
        const isBorder = Math.hypot(pdx, pdy) >= pR - 1.5;
        if (isBorder) {
          rgba[idx] = 56;
          rgba[idx + 1] = 189;
          rgba[idx + 2] = 248; // #38BDF8
        } else {
          rgba[idx] = 30;
          rgba[idx + 1] = 41;
          rgba[idx + 2] = 59; // Slate 800
        }
      }
    }
  }

  return encodePNG(size, size, rgba);
}

// Generate all required production icon assets
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA Icons for Depend Sourcing Ltd...');

// 1. 192x192 Standard
const icon192 = renderDependSourcingIcon(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
console.log('  -> public/pwa-192x192.png (192x192 PNG, created)');

// 2. 512x512 Standard
const icon512 = renderDependSourcingIcon(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
console.log('  -> public/pwa-512x512.png (512x512 PNG, created)');

// 3. 192x192 Maskable (Android Adaptive Icon with Safe Zone)
const maskable192 = renderDependSourcingIcon(192, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-192x192.png'), maskable192);
console.log('  -> public/pwa-maskable-192x192.png (192x192 Maskable PNG, created)');

// 4. 512x512 Maskable (Android Adaptive Icon with Safe Zone)
const maskable512 = renderDependSourcingIcon(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), maskable512);
console.log('  -> public/pwa-maskable-512x512.png (512x512 Maskable PNG, created)');

// 5. 180x180 Apple Touch Icon (iOS Safari)
const appleIcon = renderDependSourcingIcon(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
console.log('  -> public/apple-touch-icon.png (180x180 PNG, created)');

// 6. 64x64 Browser Favicon
const favicon = renderDependSourcingIcon(64, false);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon);
console.log('  -> public/favicon.png & public/favicon.ico (created)');

console.log('All PWA Icon assets successfully generated!');
