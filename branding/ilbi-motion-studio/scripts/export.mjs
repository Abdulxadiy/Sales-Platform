import { writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createStudioServer } from './serve.mjs';
import { launchBrowser } from './browser.mjs';
import { concepts, formats } from '../src/renderer.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const formatKey = process.argv.find(a => a.startsWith('--format='))?.split('=')[1] || 'landscape';
if (!formats[formatKey]) throw new Error('Use --format=landscape, square, or portrait');
const { width, height } = formats[formatKey];
const selected = process.argv.find(a => a.startsWith('--concept='))?.split('=')[1];
const films = selected ? concepts.filter(c => c.id === selected) : concepts;
if (!films.length) throw new Error('Unknown concept; use 01, 02, 03, or 04');
const server = createStudioServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const out = join(root, 'exports');
await mkdir(out, { recursive: true });
let browser;
try {
  browser = await launchBrowser({ width, height });
  await browser.navigate(`${base}/?capture=1&format=${formatKey}`);
  for (const c of films) {
    const suffix = formatKey === 'landscape' ? '' : `-${formatKey}`;
    const path = join(out, `ilbi-concept-${c.id}-${c.slug}${suffix}.mp4`);
    console.log(`Rendering ${c.id}: ${width}x${height}, 60 fps, ${c.duration}s`);
    await browser.evaluate(`window.ilbi.select('${c.id}')`);
    const frames = Math.round(c.duration * 60);
    const ffmpeg = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-vcodec', 'png', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', '-threads', '4', path], { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    ffmpeg.stderr.on('data', data => { stderr += data; });
    let encodeError;
    ffmpeg.on('error', e => { encodeError = e; });
    const finished = once(ffmpeg, 'close');
    ffmpeg.stdin.on('error', e => { encodeError = e; });
    for (let frame = 0; frame < frames; frame++) {
      if (encodeError) throw encodeError;
      await browser.evaluate(`window.ilbi.seek(${frame / 60})`);
      const png = await browser.screenshot();
      if (frame === frames - 1) await writeFile(join(out, `ilbi-concept-${c.id}-poster${suffix}.png`), png);
      if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
      if (frame % 60 === 0) console.log(`  ${c.id}: ${frame}/${frames}`);
    }
    ffmpeg.stdin.end();
    const [code] = await finished;
    if (code !== 0) throw new Error(`FFmpeg failed: ${stderr}`);
    console.log(`Exported: ${path}`);
  }
  if (browser.errors.length) throw new Error(browser.errors.join('\n'));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
