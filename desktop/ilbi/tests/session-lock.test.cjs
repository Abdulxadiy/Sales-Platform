const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtemp,rm}=require('node:fs/promises');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {SessionLock}=require('../session-lock.cjs');
test('idle locks persist across restart, saved tokens and polling cannot unlock',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'ilbi-lock-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  let now=0,lockedToken;
  const options={directory,clock:()=>now,authorize:async()=>({id:7}),onLock:async token=>{lockedToken=token;}};
  const lock=new SessionLock(options);await lock.initialize();await lock.activate('synthetic-token');
  now=599999;assert.equal(await lock.check(),false);
  await lock.activate('synthetic-refreshed-token'); // Refresh/reload must not reset inactivity.
  now=600001;assert.equal(await lock.check(),true);assert.equal(lockedToken,'synthetic-refreshed-token');
  await assert.rejects(lock.activate('synthetic-token'));
  const reopened=new SessionLock(options);await reopened.initialize();assert.equal(reopened.locked,true);
  await assert.rejects(reopened.activate('synthetic-token'));
  await reopened.unlock();await reopened.activate('synthetic-new-token');now+=400000;reopened.touch();now+=400000;
  assert.equal(await reopened.check(),false);
});
