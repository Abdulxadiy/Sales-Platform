const { mkdir, copyFile, writeFile, stat, rm } = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { join, resolve } = require('node:path');

async function run(executable, args, cwd) {
  await new Promise((ok, fail) => {
    const child = spawn(executable, args, { cwd, stdio: 'inherit' });
    child.once('error', fail);
    child.once('exit', code => code === 0 ? ok() : fail(Error(`Build step exited with ${code}`)));
  });
}

async function main() {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw Error('Linux x64 builder required');
  const temporaryDirectory = join(__dirname, 'build/tmp-linux');
  await mkdir(temporaryDirectory, { recursive: true });
  process.env.TMPDIR = temporaryDirectory;
  if (!process.argv.includes('--runtime-ready')) await run('python3', [resolve(__dirname, '../build_linux_runtime.py')], __dirname);
  const frontend = resolve(__dirname, '../../frontend/ilbi');
  await run(process.execPath, [join(frontend, 'node_modules/vite/bin/vite.js'), 'build'], frontend);
  const { build, Platform, Arch } = require('electron-builder');
  await rm(join(__dirname, 'release-linux/linux-unpacked'), { recursive: true, force: true });
  await build({ targets: Platform.LINUX.createTarget(['dir'], Arch.x64), projectDir: __dirname, publish: 'never', config: {
    directories: { output: 'release-linux' },
  } });
  const unpacked = join(__dirname, 'release-linux/linux-unpacked');
  await copyFile(join(__dirname, 'install-linux.sh'), join(unpacked, 'install.sh'));
  const version = require('./package.json').version;
  const name = `ILBI-${version}-linux-x64.tar.gz`;
  const artifact = join(__dirname, 'release-linux', name);
  await run('tar', ['-czf', artifact, '--transform=flags=r;s,^\\.,ILBI,', '-C', unpacked, '.'], __dirname);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(artifact)) hash.update(chunk);
  await writeFile(join(__dirname, 'release-linux/linux-build-manifest.json'), JSON.stringify({
    version, platform: 'linux', arch: 'x64', artifact: name, bytes: (await stat(artifact)).size,
    sha256: hash.digest('hex'), nativeLinuxVerified: false, sourceCommit: process.env.GITHUB_SHA || null,
  }, null, 2) + '\n');
  console.log(`Built Linux application: ${artifact}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
