const { mkdir, stat, open, writeFile } = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const { createHash } = require('node:crypto');
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
  const version = require('./package.json').version;
  const installer = join(__dirname, `release/ILBI-Setup-${version}-x64.exe`);
  const archive = join(__dirname, `release/ilbi-desktop-${version}-x64.nsis.7z`);
  let payloadBytes = 0;
  await build({ targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64), projectDir: __dirname,
    config: { artifactBuildCompleted: async event => {
      // electron-builder deletes its intermediate archive during cleanup.
      if (event.file === installer) payloadBytes = (await stat(archive)).size;
    } },
  });
  // Custom NSIS scripts bypass electron-builder's standard payload-size check.
  const output = await stat(installer);
  if (!payloadBytes || output.size < payloadBytes * 0.99) throw Error('Installer is missing its application payload.');
  const handle = await open(installer, 'r');
  try {
    const magic = Buffer.alloc(2);
    await handle.read(magic, 0, 2, 0);
    if (magic.toString() !== 'MZ') throw Error('Installer is not a Windows executable.');
  } finally { await handle.close(); }
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(installer)) hash.update(chunk);
  await writeFile(join(__dirname, 'release/desktop-build-manifest.json'), JSON.stringify({
    version, platform: 'win32', arch: 'x64', installerBytes: output.size, payloadBytes,
    sha256: hash.digest('hex'), nativeWindowsServiceVerified: false,
    sourceCommit: process.env.GITHUB_SHA || null,
  }, null, 2) + '\n');
  console.log(`Verified installer payload: ${installer} (${output.size} bytes)`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
