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
  assert.equal(reopened.reason,'idle');
  await reopened.lock('old-token');assert.equal(reopened.reason,'idle');
  await assert.rejects(reopened.activate('synthetic-token'));
  await reopened.unlock();await reopened.activate('synthetic-new-token');now+=400000;reopened.touch();now+=400000;
  assert.equal(await reopened.check(),false);
  await reopened.lock('synthetic-new-token','explicit');await reopened.lock('old-token');
  const explicit=new SessionLock(options);await explicit.initialize();assert.equal(explicit.reason,'explicit');
});

test('recent activity resets the full ten minutes; refresh cannot extend the daily second factor',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'ilbi-daily-lock-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  let now=0,wall=1700000000000;
  const lock=new SessionLock({directory,clock:()=>now,wallClock:()=>wall,authorize:async()=>({id:7}),onLock:async()=>{}});
  const token=expires=>`e30.${Buffer.from(JSON.stringify({mfa_expires_at:expires})).toString('base64url')}.synthetic`;
  await lock.activate(token(wall/1000+86400));
  now=599999;lock.touch();now=600001;assert.equal(await lock.check(),false);
  now=1199998;assert.equal(await lock.check(),false);now=1199999;assert.equal(await lock.check(),true);
  await lock.unlock();await lock.activate(token(wall/1000+86400));
  lock.idleMinutes=2000;
  now+=86399999;lock.touch();assert.equal(await lock.check(),false);
  // A repeated token or a wall-clock rollback must not renew the prior deadline.
  wall-=3600000;await lock.activate(token(1700000000+86400));now+=1;
  assert.equal(await lock.check(),true);assert.equal(lock.reason,'mfa_expired');
});
