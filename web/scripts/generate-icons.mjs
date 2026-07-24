import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// SVG placeholder: cuadrado negro (redondeado o full-bleed) con monograma "ID" blanco.
function svg({ size, fontRatio, radiusRatio }) {
  const r = Math.round(size * radiusRatio);
  const fontSize = Math.round(size * fontRatio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#000000"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
      font-family="Arial, Helvetica, sans-serif" font-weight="700"
      font-size="${fontSize}" fill="#ffffff">ID</text>
  </svg>`;
}

async function gen(name, opts) {
  await sharp(Buffer.from(svg(opts))).png().toFile(join(outDir, name));
  console.log('wrote', name);
}

// any: esquinas redondeadas (18%), monograma grande (50%).
await gen('icon-192.png', { size: 192, fontRatio: 0.5, radiusRatio: 0.18 });
await gen('icon-512.png', { size: 512, fontRatio: 0.5, radiusRatio: 0.18 });
// maskable: full-bleed (radius 0) + monograma dentro de la safe-zone (~36%).
await gen('icon-512-maskable.png', { size: 512, fontRatio: 0.36, radiusRatio: 0 });
// apple-touch: full-bleed, sin transparencia (iOS enmascara las esquinas).
await gen('apple-touch-icon.png', { size: 180, fontRatio: 0.5, radiusRatio: 0 });
