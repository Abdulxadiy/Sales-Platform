// Generate the Windows icon from the existing editable ILBI vectors.
// Chrome rasterizes every ICO frame separately; no photo/logo bitmap is scaled up.
import { writeFile } from 'node:fs/promises';
import { paths } from '../frontend/ilbi/src/components/common/ilbi/logo.js';
import { launchBrowser } from '../frontend/ilbi/tests/browser/chrome.mjs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <linearGradient id="tile" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#f5f7fb"/></linearGradient>
  <linearGradient id="blue" x1="90" y1="5" x2="165" y2="266" gradientUnits="userSpaceOnUse"><stop stop-color="#0095ff"/><stop offset=".43" stop-color="#006bff"/><stop offset="1" stop-color="#0049ff"/></linearGradient>
  <clipPath id="ribbon"><path d="${paths.ribbon}"/></clipPath>
</defs>
<rect x="12" y="12" width="488" height="488" rx="112" fill="url(#tile)" stroke="#dce3ed" stroke-width="2"/>
<g transform="translate(57.23 59.38) scale(1.43)">
  <g fill="#141820"><path d="${paths.dot}"/><path d="${paths.stem}"/><path d="${paths.bowl}"/></g>
  <path d="${paths.ribbon}" fill="url(#blue)"/>
  <path d="${paths.ribbonFace}" fill="#006bff" clip-path="url(#ribbon)"/>
  <path d="${paths.ribbonTurn}" fill="#0055ff"/>
</g></svg>\n`;
const root = new URL('../', import.meta.url);
await writeFile(new URL('frontend/ilbi/public/brand/ilbi-desktop.svg', root), svg);
const browser = await launchBrowser();
try {
  const sizes = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256, 512];
  const frames = [];
  for (const size of sizes) {
    const base64 = await browser.evaluate(`(async () => {
      const image = new Image();
      image.src = 'data:image/svg+xml;base64,' + btoa(${JSON.stringify(svg)});
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = ${size};
      canvas.getContext('2d').drawImage(image, 0, 0, ${size}, ${size});
      return canvas.toDataURL('image/png').split(',')[1];
    })()`);
    const png = Buffer.from(base64, 'base64');
    if (size === 512) {
      await writeFile(new URL('frontend/ilbi/public/brand/ilbi-desktop-512.png', root), png);
    } else { frames.push({ size, png }); }
  }
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile(new URL('desktop/ilbi/icon.ico', root), Buffer.concat([header, ...frames.map(frame => frame.png)]));
  console.log(JSON.stringify({ generated: 'desktop/ilbi/icon.ico', sizes: frames.map(frame => frame.size), transparentCorners: true }));
} finally { await browser.close(); }
