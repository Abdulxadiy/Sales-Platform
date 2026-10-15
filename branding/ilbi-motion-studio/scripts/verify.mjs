import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { concepts, formats } from '../src/renderer.js';
import { createStudioServer } from './serve.mjs';
import { launchBrowser } from './browser.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const qa = join(root, 'qa');
await mkdir(qa, { recursive: true });
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const checks = [];
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); };

for (const c of concepts) {
  for (let i = 0; i <= Math.round(c.duration * 60); i++) {
    const t = i / 60;
    const s = c.state(t);
    const visit = value => {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${c.id} at ${t}: non-finite parameter`);
      if (value && typeof value === 'object') Object.values(value).forEach(visit);
    };
    visit(s);
  }
  const final = c.state(c.duration);
  check(final.parts.every(p => p.opacity === 1 && p.x === 0 && p.y === 0 && p.scale === 1), `${c.id}: exact final monogram registration`);
  check(final.glyphs.every(p => p.opacity === 1 && p.x === 0 && p.y === 0 && p.scale === 1), `${c.id}: exact final wordmark registration`);
  check(final.seed.opacity === 0 && final.trail === 0 && final.sweep === 0 && final.ripple === 0 && final.lineOpacity === 0 && final.shadow === 0 && final.lift === 0, `${c.id}: all transient effects gone at end`);
}
check(concepts[0].state(0).parts.every(p => p.opacity === 0), '01: empty opening');
check(concepts[1].state(0).parts.every(p => p.opacity === 1) && concepts[1].state(0).parts[1].x < 0 && concepts[1].state(0).parts[3].x > 0, '02: visible disassembled opening');
check(concepts[2].state(.4).parts.every(p => p.opacity === 0) && concepts[2].state(.4).seed.opacity === 1, '03: only seed and shadow at 0.4 s');
check(concepts[2].state(1).seed.y < concepts[2].state(.4).seed.y - 100, '03: physical upward jump');
check(concepts[3].state(0).parts.every(p => p.opacity === 1) && concepts[3].state(0).opacity === .78, '04: full muted logo from the beginning');

const server = createStudioServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let reduced;
const checkpointTimes = [[0, .95, 1.85, 3, 5.2], [0, 1.1, 1.95, 2.95, 5.1], [.4, 1, 2.1, 3, 5.1], [0, 1.1, 1.8, 2.8, 5]];
const finalHashes = [];
try {
  browser = await launchBrowser();
  await browser.navigate(`${base}/?capture=1`);
  for (const [index, c] of concepts.entries()) {
    await browser.evaluate(`window.ilbi.select('${c.id}')`);
    const images = [];
    for (const [beat, t] of checkpointTimes[index].entries()) {
      await browser.evaluate(`window.ilbi.seek(${t})`);
      const png = await browser.screenshot();
      const path = join(qa, `concept-${c.id}-beat-${beat + 1}-${t.toFixed(2)}s.png`);
      await writeFile(path, png); images.push(path);
      if (beat === 4) finalHashes.push(hash(png));
    }
    await browser.evaluate(`window.ilbi.seek(${c.duration - 1})`);
    const hold = await browser.screenshot();
    check(hash(hold) === finalHashes[index], `${c.id}: final second is pixel-stable`);
    await browser.evaluate('window.ilbi.seek(2.1)');
    const forward = hash(await browser.screenshot());
    await browser.evaluate(`window.ilbi.seek(${c.duration});window.ilbi.seek(0);window.ilbi.seek(2.1)`);
    check(hash(await browser.screenshot()) === forward, `${c.id}: backward seek and replay reproduce identical pixels`);
    const args = ['montage'];
    images.forEach((path, i) => args.push('-label', `${checkpointTimes[index][i].toFixed(2)} s`, path));
    args.push('-font', 'DejaVu-Sans', '-pointsize', '15', '-background', '#e9eef5', '-fill', '#243244', '-tile', '5x1', '-geometry', '384x216+6+15', join(qa, `concept-${c.id}-contact-sheet.png`));
    const montage = spawnSync('magick', args, { encoding: 'utf8' });
    if (montage.status !== 0) console.log(`Contact sheet unavailable: ${montage.stderr}`);
    console.log(`Concept ${c.id}: checkpoints, hold, and seek passed.`);
  }
  check(new Set(finalHashes).size === 1, 'All four films have pixel-identical final logos');
  for (const [key, { width, height }] of Object.entries(formats)) {
    await browser.resize(width, height);
    await browser.evaluate(`window.ilbi.format('${key}');window.ilbi.seek(5.2)`);
    const bounds = await browser.evaluate(`(() => { const n=document.querySelector('#stage [data-node=body]');const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,sw:innerWidth,sh:innerHeight}; })()`);
    check(bounds.x > bounds.sw * .1 && bounds.y > bounds.sh * .1 && bounds.x + bounds.w < bounds.sw * .9 && bounds.y + bounds.h < bounds.sh * .9, `${key}: logo fits inside safe margins`);
    await writeFile(join(qa, `format-${key}.png`), await browser.screenshot());
  }
  await browser.resize(1440, 1120);
  await browser.navigate(base);
  await browser.evaluate('window.ilbi.seek(5.2)');
  await writeFile(join(qa, 'studio-desktop.png'), await browser.screenshot());
  // Exercise real gallery controls rather than only the capture API.
  await browser.evaluate(`document.querySelector('[data-concept="03"]').click();document.querySelector('#timeline').value='1';document.querySelector('#timeline').dispatchEvent(new Event('input',{bubbles:true}));`);
  const selected = await browser.evaluate('window.ilbi.snapshot()');
  check(selected.concept === '03' && selected.time === 1 && selected.playing === false, `Gallery selection and scrubber control the actual rendered animation (${selected.concept}, ${selected.time}s, playing=${selected.playing})`);
  await browser.evaluate(`document.querySelector('[data-beat="2"]').click()`);
  check((await browser.evaluate('window.ilbi.snapshot()')).time === 1.35, 'Beat buttons seek to labeled timeline positions');
  await browser.evaluate(`document.getElementById('reference').click()`);
  check(await browser.evaluate('document.getElementById("reference-dialog").open'), 'Reference dialog opens from the gallery');
  await browser.evaluate('document.getElementById("close-reference").click()');
  await browser.evaluate(`window.ilbi.select('01');window.ilbi.seek(5.2);scrollTo(0,0)`);
  for (const [width, height, name] of [[768, 1100, 'tablet'], [390, 1100, 'mobile']]) {
    await browser.resize(width, height);
    check(await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'), `${name}: no horizontal overflow`);
    await writeFile(join(qa, `studio-${name}.png`), await browser.screenshot());
  }
  check(browser.errors.length === 0, `No browser runtime or HTTP errors (${browser.errors.length})`);
  reduced = await launchBrowser({ width: 1440, height: 1000, reducedMotion: true });
  await reduced.navigate(base);
  for (const c of concepts) {
    await reduced.evaluate(`document.querySelector('[data-concept="${c.id}"]').click()`);
    const snapshot = await reduced.evaluate('window.ilbi.snapshot()');
    check(snapshot.time === c.duration && snapshot.playing === false, `${c.id}: reduced-motion immediately shows static final identity`);
  }
  check(reduced.errors.length === 0, 'Reduced-motion browser has no runtime errors');
  await writeFile(join(qa, 'verification.json'), JSON.stringify({ checks, finalHashes, browserErrors: browser.errors, reducedMotionErrors: reduced.errors }, null, 2));
  console.log(`PASS: ${checks.length} motion, browser, responsive, and reduced-motion checks.`);
} finally {
  if (browser) await browser.close();
  if (reduced) await reduced.close();
  await new Promise(resolve => server.close(resolve));
}
