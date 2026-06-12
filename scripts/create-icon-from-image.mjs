import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const source = '/Users/kun/Desktop/微信图片_20260114122621_7473_207.jpg';
const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);
const assetsDir = path.join(projectRoot, 'assets');
const iconsetDir = path.join(projectRoot, 'build', 'icon.iconset');
const cutoutPath = path.join(assetsDir, 'yaba-avatar.png');
const iconPngPath = path.join(assetsDir, 'yaba-icon-1024.png');

await fs.mkdir(assetsDir, { recursive: true });
await fs.mkdir(iconsetDir, { recursive: true });

const crop = {
  left: 720,
  top: 840,
  width: 1720,
  height: 1370
};

const input = sharp(source).extract(crop).ensureAlpha();
const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
const key = { r: 181, g: 209, b: 125 };

for (let index = 0; index < data.length; index += info.channels) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const distance = Math.hypot(r - key.r, g - key.g, b - key.b);
  const greenDominant = g > r + 14 && g > b + 24;

  if (distance < 54 || greenDominant) {
    data[index + 3] = 0;
  } else if (distance < 92) {
    data[index + 3] = Math.min(data[index + 3], Math.round((distance - 54) * 6));
  }
}

const pixelCount = info.width * info.height;
const visited = new Uint8Array(pixelCount);
const queue = new Int32Array(pixelCount);
let head = 0;
let tail = 0;

function enqueueIfOpaque(pixelIndex) {
  if (pixelIndex < 0 || pixelIndex >= pixelCount) return;
  if (visited[pixelIndex]) return;
  if (data[pixelIndex * info.channels + 3] < 16) return;
  visited[pixelIndex] = 1;
  queue[tail] = pixelIndex;
  tail += 1;
}

for (let x = 0; x < info.width; x += 1) {
  enqueueIfOpaque(x);
  enqueueIfOpaque((info.height - 1) * info.width + x);
}

for (let y = 0; y < info.height; y += 1) {
  enqueueIfOpaque(y * info.width);
  enqueueIfOpaque(y * info.width + info.width - 1);
}

while (head < tail) {
  const pixelIndex = queue[head];
  head += 1;
  const x = pixelIndex % info.width;
  const y = Math.floor(pixelIndex / info.width);
  if (x > 0) enqueueIfOpaque(pixelIndex - 1);
  if (x < info.width - 1) enqueueIfOpaque(pixelIndex + 1);
  if (y > 0) enqueueIfOpaque(pixelIndex - info.width);
  if (y < info.height - 1) enqueueIfOpaque(pixelIndex + info.width);
}

for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
  if (visited[pixelIndex]) {
    data[pixelIndex * info.channels + 3] = 0;
  }
}

visited.fill(0);
let largestStart = -1;
let largestSize = 0;

function isOpaque(pixelIndex) {
  return data[pixelIndex * info.channels + 3] >= 16;
}

for (let start = 0; start < pixelCount; start += 1) {
  if (visited[start] || !isOpaque(start)) continue;

  head = 0;
  tail = 0;
  visited[start] = 1;
  queue[tail] = start;
  tail += 1;

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    const neighbors = [];
    if (x > 0) neighbors.push(pixelIndex - 1);
    if (x < info.width - 1) neighbors.push(pixelIndex + 1);
    if (y > 0) neighbors.push(pixelIndex - info.width);
    if (y < info.height - 1) neighbors.push(pixelIndex + info.width);

    for (const next of neighbors) {
      if (!visited[next] && isOpaque(next)) {
        visited[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }
  }

  if (tail > largestSize) {
    largestSize = tail;
    largestStart = start;
  }
}

visited.fill(0);
if (largestStart >= 0) {
  head = 0;
  tail = 0;
  visited[largestStart] = 1;
  queue[tail] = largestStart;
  tail += 1;

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % info.width;
    const y = Math.floor(pixelIndex / info.width);
    const neighbors = [];
    if (x > 0) neighbors.push(pixelIndex - 1);
    if (x < info.width - 1) neighbors.push(pixelIndex + 1);
    if (y > 0) neighbors.push(pixelIndex - info.width);
    if (y < info.height - 1) neighbors.push(pixelIndex + info.width);

    for (const next of neighbors) {
      if (!visited[next] && isOpaque(next)) {
        visited[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (!visited[pixelIndex]) {
      data[pixelIndex * info.channels + 3] = 0;
    }
  }
}

const gold = { r: 232, g: 176, b: 38 };
const lightGreen = { r: 190, g: 226, b: 128 };

for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
  const offset = pixelIndex * info.channels;
  const alpha = data[offset + 3];
  if (alpha < 16) continue;

  const x = pixelIndex % info.width;
  const y = Math.floor(pixelIndex / info.width);
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const isGrayClothing =
    y > Math.round(info.height * 0.58) &&
    r > 95 &&
    r < 205 &&
    g > 95 &&
    g < 205 &&
    b > 90 &&
    b < 205 &&
    Math.abs(r - g) < 30 &&
    Math.abs(g - b) < 34;
  const isBowTie =
    y > Math.round(info.height * 0.66) &&
    x > Math.round(info.width * 0.26) &&
    x < Math.round(info.width * 0.76) &&
    r > 185 &&
    g > 115 &&
    g < 195 &&
    b > 75 &&
    b < 170 &&
    r > g + 28 &&
    g > b + 6;

  if (isBowTie) {
    data[offset] = lightGreen.r;
    data[offset + 1] = lightGreen.g;
    data[offset + 2] = lightGreen.b;
  } else if (isGrayClothing) {
    const shade = Math.max(0.78, Math.min(1.08, (r + g + b) / 465));
    data[offset] = Math.round(gold.r * shade);
    data[offset + 1] = Math.round(gold.g * shade);
    data[offset + 2] = Math.round(gold.b * shade);
  }
}

let minX = info.width;
let minY = info.height;
let maxX = 0;
let maxY = 0;

for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
  const alpha = data[pixelIndex * info.channels + 3];
  if (alpha < 16) continue;
  const x = pixelIndex % info.width;
  const y = Math.floor(pixelIndex / info.width);
  minX = Math.min(minX, x);
  minY = Math.min(minY, y);
  maxX = Math.max(maxX, x);
  maxY = Math.max(maxY, y);
}

const cutout = sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: info.channels
  }
}).png();

const hasVisiblePixels = minX <= maxX && minY <= maxY;
const padding = 8;
const tightBounds = hasVisiblePixels
  ? {
      left: Math.max(0, minX - padding),
      top: Math.max(0, minY - padding),
      width: Math.min(info.width - Math.max(0, minX - padding), maxX - minX + padding * 2),
      height: Math.min(info.height - Math.max(0, minY - padding), maxY - minY + padding * 2)
    }
  : { left: 0, top: 0, width: info.width, height: info.height };

await cutout.extract(tightBounds).png().toFile(cutoutPath);

await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite([
    {
      input: await sharp(cutoutPath)
        .resize({ width: 1024, height: 1024, fit: 'cover', position: 'center' })
        .png()
        .toBuffer(),
      gravity: 'center'
    }
  ])
  .png()
  .toFile(iconPngPath);

const iconFiles = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
];

for (const [fileName, size] of iconFiles) {
  await sharp(iconPngPath)
    .resize(size, size, { fit: 'contain' })
    .png()
    .toFile(path.join(iconsetDir, fileName));
}

console.log(`cutout: ${cutoutPath}`);
console.log(`icon png: ${iconPngPath}`);
console.log(`iconset: ${iconsetDir}`);
