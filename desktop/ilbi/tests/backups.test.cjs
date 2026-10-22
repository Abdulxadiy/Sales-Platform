const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtemp,mkdir,writeFile,readFile,rm,readdir}=require('node:fs/promises');
const {join,resolve}=require('node:path'),{tmpdir}=require('node:os');
const {Backups,recoverRestore,protectProfile}=require('../backups.cjs');
test('authenticated backup restores stopped database, media, queue and drafts; tampering never touches live files',{skip:process.platform==='win32'&&!process.env.ILBI_DESKTOP_TEST_RESOURCES},async t=>{
  const directory=await mkdtemp(join(tmpdir(),'ilbi-backup-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  await protectProfile(directory);
  await mkdir(join(directory,'postgres/global'),{recursive:true});await mkdir(join(directory,'media'));
  await writeFile(join(directory,'postgres/PG_VERSION'),'16');await writeFile(join(directory,'postgres/global/pg_control'),'synthetic-control');
  await writeFile(join(directory,'postgres/queue'),'original-pending-sale');await writeFile(join(directory,'media/photo'),'original-image');
  let drafts={local:{'ilbi_account_draft:1:1:pos_cart':'synthetic-cart'},files:[]},running=true;
  const resources=process.env.ILBI_DESKTOP_TEST_RESOURCES;
  const manager=new Backups({directory,key:'synthetic-backup-key',
    python:resources?join(resources,process.platform==='win32'?'backend/python/python.exe':'backend/python/bin/python3'):'python3',
    helper:resources?join(resources,'backend/backup_store.py'):resolve(__dirname,'../../backup_store.py'),
    quiesce:async()=>{running=false;},resume:async()=>{running=true;},getDrafts:async()=>drafts,setDrafts:async value=>{drafts=value;}});
  const id=await manager.create();assert(running);assert.equal((await readFile(join(directory,'backups',id))).includes(Buffer.from('original-pending-sale')),false);
  await writeFile(join(directory,'postgres/queue'),'newer-pending-sale');await writeFile(join(directory,'media/photo'),'newer-image');drafts={local:{},files:[]};
  const restored=await manager.restore(id);assert(restored.restored);assert(running);
  assert.equal(await readFile(join(directory,'postgres/queue'),'utf8'),'original-pending-sale');assert.equal(await readFile(join(directory,'media/photo'),'utf8'),'original-image');assert.equal(drafts.local['ilbi_account_draft:1:1:pos_cart'],'synthetic-cart');
  assert.notEqual(restored.previousBackup,id);assert.equal((await manager.list()).length,2);
  const path=join(directory,'backups',id),bytes=await readFile(path);bytes[50]^=1;await writeFile(path,bytes);
  await assert.rejects(manager.restore(id));assert(running);assert.equal(await readFile(join(directory,'postgres/queue'),'utf8'),'original-pending-sale');
  assert.equal((await readdir(directory)).some(name=>name.startsWith('.restore-')),false);
});
test('a crash between restore renames recovers original data before startup',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'ilbi-restore-journal-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const staging='.restore-12345678-1234-1234-1234-123456789abc';
  await mkdir(join(directory,staging,'postgres.previous'),{recursive:true});await mkdir(join(directory,'postgres'));
  await writeFile(join(directory,staging,'postgres.previous/unsent'),'original-durable-outbox');await writeFile(join(directory,'postgres/unsent'),'interrupted-replacement');
  await writeFile(join(directory,'restore.journal'),JSON.stringify({staging,swapped:[{name:'postgres',existed:true}]}));
  await recoverRestore(directory);assert.equal(await readFile(join(directory,'postgres/unsent'),'utf8'),'original-durable-outbox');
  assert.equal((await readdir(directory)).some(name=>name===staging||name==='restore.journal'),false);
});
