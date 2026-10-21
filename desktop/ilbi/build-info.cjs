const { execFileSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
function writeBuildInfo() {
  const sourceCommit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim();
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw Error('Invalid build commit');
  const buildTimestamp = Number(execFileSync('git', ['show', '-s', '--format=%ct', sourceCommit], { cwd: __dirname, encoding: 'utf8' }).trim()) * 1000;
  const info = { version: require('./package.json').version, sourceCommit, buildTimestamp };
  writeFileSync(join(__dirname, 'build-info.json'), JSON.stringify(info) + '\n');
  return info;
}
module.exports = { writeBuildInfo };
