import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public", { recursive: true });

function makeSVG(size) {
  const fontSize = Math.round(size * 0.52);
  const r = Math.round(size * 0.22); // corner radius
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#7F77DD"/>
      <stop offset="100%" stop-color="#3D35A0"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.025}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <text
    x="${size / 2}" y="${size * 0.66}"
    font-family="'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', 'MS Gothic', serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
    dominant-baseline="auto"
    filter="url(#glow)"
    opacity="0.97"
  >漢</text>
</svg>`;
}

const sizes = [
  { name: "icon-512.png", size: 512 },
  { name: "icon-192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];

for (const { name, size } of sizes) {
  await sharp(Buffer.from(makeSVG(size)))
    .png()
    .toFile(`public/${name}`);
  console.log(`✅ public/${name}`);
}

console.log("Done!");
