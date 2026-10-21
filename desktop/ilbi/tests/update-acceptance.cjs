// Installed acceptance: only disposable, unenrolled native QA profiles are used.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { stat } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { freePort, OFFICIAL_SERVER } = require('../runtime.cjs');
const pause = ms => new Promise(ok => setTimeout(ok, ms));
const executable = process.env.ILBI_DESKTOP_INSTALLED_EXE;
const artifact = process.env.ILBI_DESKTOP_UPDATE_PACKAGE;
if (!executable || !artifact) throw Error('Native QA installer and executable are required');
const sockets = [];
async function connect(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(item => item.type === 'node') || targets.find(item => item.type === 'page' && item.url.includes('/login'));
  if (!target) throw Error('Debugger not ready');
  const socket = new WebSocket(target.webSocketDebuggerUrl); sockets.push(socket);
  await new Promise((ok, fail) => { socket.onopen = ok; socket.onerror = fail; });
  const pending = new Map(); let sequence = 0;
  socket.onmessage = ({data}) => { const message=JSON.parse(data), item=pending.get(message.id); if(!item)return;pending.delete(message.id);clearTimeout(item.timer);message.error||message.result?.exceptionDetails?item.fail(Error(JSON.stringify(message))):item.ok(message.result); };
  const evaluate = async expression => {
    const result = await new Promise((ok,fail) => { const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);fail(Error('Native update evaluation timeout'));},30000);pending.set(id,{ok,fail,timer});socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true,userGesture:true}})); });
    return result.result.value;
  };
  evaluate.close = () => socket.close();
  return evaluate;
}
async function wait(action, message, seconds=90) {
  for(let i=0;i<seconds*5;i++){try{const result=await action();if(result)return result;}catch{}await pause(200)}throw Error(message);
}
async function status() { return (await fetch('http://127.0.0.1:49244/desktop/app-update/', {signal:AbortSignal.timeout(2000)})).json(); }
async function launch() {
  const inspect = await freePort(), debug = await freePort(), environment={...process.env}; delete environment.ELECTRON_RUN_AS_NODE;
  const child = spawn(executable,[`--inspect=127.0.0.1:${inspect}`,`--remote-debugging-port=${debug}`,'--remote-debugging-address=127.0.0.1'],{env:environment,stdio:['ignore','ignore','pipe']});
  let log='';child.stderr.on('data',data=>log=(log+data).slice(-2000));
  const main=await wait(()=>connect(inspect),'Main debugger unavailable: '+log);
  await wait(()=>main('Boolean(process.mainModule.require("./application.cjs").updater)'),'Installed updater is not ready');
  const page=await wait(()=>connect(debug),'Login page is not ready');
  await wait(()=>page('location.pathname==="/login" && document.readyState==="complete" && typeof window.ilbiDesktop?.getUpdateStatus==="function" && Boolean(document.querySelector("form"))'),'Login document and bridge are not ready');
  const local=await page('fetch("/desktop/status/").then(response=>response.json())');
  assert.equal(local.enrolled,false,'Never run update acceptance against an enrolled store');
  return {child,main,page};
}
async function closeNormal() {
  const environment={...process.env}; delete environment.ELECTRON_RUN_AS_NODE;
  const secondary=spawn(executable,['--ilbi-quit-for-update'],{env:environment,stdio:'ignore'});
  await new Promise((ok,fail)=>{secondary.once('exit',ok);secondary.once('error',fail)});
  await wait(async()=>{try{await status();return false}catch{return true}},'Updated app did not close',180);
}
const sql = `
import os,sys,django,uuid
sys.path.insert(0,os.environ['ILBI_QA_APP'])
os.environ['DJANGO_SETTINGS_MODULE']='config.settings_desktop'
django.setup()
from apps.desktop_sync.models import LocalOperation
if os.environ.get('ILBI_QA_SEED')=='1':
 LocalOperation.objects.get_or_create(user_id=900000001,tenant_id=900000001,title='Update durability QA',payload={'kept':True},status='waiting')
assert LocalOperation.objects.filter(title='Update durability QA',status='waiting',payload={'kept':True}).count()==1
print('durable-outbox-preserved')
`;
async function database(main, seed=false) {
  return main(`(async()=>{
    const r=process.mainModule.require.bind(process.mainModule);
    const {app,safeStorage}=r('electron'),fs=r('node:fs'),path=r('node:path');
    const dataDir=app.getPath('userData'),record=JSON.parse(safeStorage.decryptString(fs.readFileSync(path.join(dataDir,'device.vault'))));
    const port=fs.readFileSync(path.join(dataDir,'postgres/postmaster.pid'),'utf8').split('\\n')[3].trim();
    const resources=process.resourcesPath;
    const env={...process.env,ILBI_DESKTOP_DATA:dataDir,ILBI_DESKTOP_SECRET:record.secrets.djangoSecret,ILBI_DESKTOP_VAULT_KEY:record.secrets.vaultKey,ILBI_DESKTOP_BRIDGE_KEY:'qa-only',ILBI_DESKTOP_DB_PASSWORD:record.secrets.databasePassword,ILBI_DESKTOP_DB_PORT:port,ILBI_QA_APP:path.join(resources,'backend/app'),ILBI_QA_SEED:${JSON.stringify(seed?'1':'0')}};
    const python=path.join(resources,process.platform==='win32'?'backend/python/python.exe':'backend/python/bin/python3');
    const result=await r('node:util').promisify(r('node:child_process').execFile)(python,['-c',${JSON.stringify(sql)}],{env});return result.stdout.trim();
  })()`);
}
let running;
(async()=>{
  running=await launch();
  console.log('Update QA: installed application and private unenrolled profile ready.');
  assert.equal(await database(running.main,true),'durable-outbox-preserved');
  await running.page('localStorage.setItem("ilbi_update_draft_qa","kept across update");true');
  const vaultExpression=`(()=>{const r=process.mainModule.require.bind(process.mainModule),{app}=r('electron');return r('node:crypto').createHash('sha256').update(r('node:fs').readFileSync(r('node:path').join(app.getPath('userData'),'device.vault'))).digest('hex')})()`;
  const vaultHash=await running.main(vaultExpression);
  const hash=createHash('sha256');for await(const part of createReadStream(artifact))hash.update(part);
  const build=await running.main('process.mainModule.require("./application.cjs").updater.current');
  const name=process.platform==='win32'?`ILBI-Setup-${build.version}-x64.exe`:`ILBI-${build.version}-linux-x64.tar.gz`;
  const release={...build,bytes:(await stat(artifact)).size,sha256:hash.digest('hex'),url:`/downloads/${build.sourceCommit}/${name}`,buildTimestamp:Date.now()};
  const key=process.platform==='win32'?'windows':'linux';
  await running.main(`(()=>{const r=process.mainModule.require.bind(process.mainModule),updater=r('./application.cjs').updater;updater.stop();updater.current={...updater.current,sourceCommit:'${'a'.repeat(40)}',buildTimestamp:1};updater.fetcher=async url=>url.endsWith('/releases.json')?new Response(JSON.stringify({schema:1,${key}:${JSON.stringify(release)}})):new Response(r('node:stream').Readable.toWeb(r('node:fs').createReadStream(${JSON.stringify(artifact)})));return true})()`);
  await running.page('window.ilbiDesktop.checkForUpdates()');
  console.log('Update QA: update notice received.');
  await wait(()=>running.page('Boolean(document.querySelector(".desktop-update-notice>.btn"))'),'No in-app update notice');
  // Node's inspector deliberately holds process shutdown until it disconnects.
  running.main.close();
  // This actual UI button downloads the real package and starts its real installer.
  await running.page('document.querySelector(".desktop-update-notice>.btn").click();true');
  console.log('Update QA: actual download and installer requested.');
  await wait(()=>running.child.exitCode!==null,'Old app did not exit cleanly',240);
  assert.equal(running.child.exitCode,0);
  console.log('Update QA: old application exited cleanly.');
  await wait(async()=>{const value=await status();return value.installedBuild===build.sourceCommit},'Installer did not reopen ILBI',240);
  await closeNormal();
  console.log('Update QA: updated application relaunched and closed cleanly.');
  running=await launch();
  assert.equal(await running.page('localStorage.getItem("ilbi_update_draft_qa")'),'kept across update');
  assert.equal(await database(running.main),'durable-outbox-preserved');
  const after=await running.main(vaultExpression);
  assert.equal(after,vaultHash,'Encrypted vault must remain byte-for-byte unchanged');
  running.main.close();
  await running.page('setTimeout(()=>window.close(),50);true');
  await wait(()=>running.child.exitCode!==null,'QA application did not close',180);
  assert.equal(running.child.exitCode,0);
  console.log(`PASS installed ${process.platform} update: UI notice, real verified download, visible installer, automatic exit/relaunch, durable outbox, encrypted vault and browser drafts preserved.`);
})().catch(async error=>{console.error(error);if(running?.child.exitCode===null)running.child.kill();else await closeNormal().catch(()=>{});process.exitCode=1}).finally(()=>{for(const socket of sockets)socket.close()});
