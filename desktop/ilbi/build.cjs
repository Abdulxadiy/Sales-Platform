const { mkdir } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { spawn } = require('node:child_process');

async function run(executable, args, cwd) {
  await new Promise((ok, fail) => {
    const child = spawn(executable, args, { cwd, stdio: 'inherit' });
    child.once('error', fail);
    child.once('exit', code => code === 0 ? ok() : fail(Error(`Build step exited with ${code}`)));
  });
}
async function main() {
  const assetCache = join(require('node:os').tmpdir(), 'ilbi-windows-assets');
  // NSIS may need more scratch space than a small tmpfs provides.
  const temporaryDirectory = join(__dirname, 'build/tmp');
  await mkdir(temporaryDirectory, { recursive: true });
  process.env.TMPDIR = temporaryDirectory;
  process.env.TMP = temporaryDirectory;
  process.env.TEMP = temporaryDirectory;
  await run('python', [resolve(__dirname, '../build_windows_runtime.py'), '--code-only', '--cache', assetCache], __dirname);
  const frontend = resolve(__dirname, '../../frontend/ilbi');
  await run(process.execPath, [join(frontend, 'node_modules/vite/bin/vite.js'), 'build'], frontend);
  const { build, Platform, Arch } = require('electron-builder');
  await build({ targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64), projectDir: __dirname });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
