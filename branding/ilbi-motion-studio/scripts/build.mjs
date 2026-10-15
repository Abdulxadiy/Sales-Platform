import { cp, mkdir, readdir, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function check(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, file.name);
    if (file.isDirectory()) await check(path);
    else if (/\.(mjs|js)$/.test(file.name)) {
      const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr);
    }
  }
}
await check(join(root, 'src'));
await check(join(root, 'scripts'));
await access(join(root, 'assets/studio-sans.ttf'));
const out = join(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out);
for (const name of ['index.html', 'src', 'assets', 'exports']) await cp(join(root, name), join(out, name), { recursive: true });
console.log('Build passed. Standalone static output: dist/ (no external dependencies).');
