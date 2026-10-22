const test=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PairingManager}=require('../pairing-manager.cjs');
test('owner approval provisions a unique LAN register and requires matching fingerprints',async()=>{
  let host={mode:'host',registers:[]},client=null,job=null,lan=false,navigated=false;
  const relay=async(token,body)=>{
    if(token!=='owner-token')throw Error('Owner only');
    if(body.action==='create'){job={id:randomUUID(),code:'12345678',state:'waiting'};return {...job};}
    if(body.action==='approve'){job.payload=body.payload;job.state='approved';}
    if(body.action==='cancel'){job.state='expired';job.payload=null;}
    return {...job};
  };
  const publicRequest=async(kind,body)=>{
    if(kind==='claim'){
      if(body.code!==job.code||job.state!=='waiting')throw Error('One use');
      Object.assign(job,{state:'claimed',public_key:body.public_key,client_name:body.name});return {...job,claim_token:'synthetic-secret-claim'};
    }
    if(body.claim_token!=='synthetic-secret-claim')throw Error('Wrong claim');
    if(body.complete){job.state='completed';job.payload=null;}
    return {...job};
  };
  const primary=new PairingManager({relay,getConfiguration:()=>host,saveConfiguration:async value=>{host=value;},enableLAN:async()=>{lan=host.registers.length>0;},selectAddress:async()=> '192.168.1.10',certificate:async()=> '-----BEGIN CERTIFICATE-----synthetic'});
  const secondary=new PairingManager({publicRequest,getConfiguration:()=>client,saveConfiguration:async value=>{client=value;},probe:async pairing=>{assert.equal(lan,true);assert.equal(pairing.key,host.registers[0].key);return {desktop:true,enrolled:true};},navigate:async()=>{navigated=true;}});
  await assert.rejects(primary.create('staff-token'));const created=await primary.create('owner-token');assert.equal(lan,false);
  const claimed=await secondary.join(created.code);assert.equal(client,null);assert.equal(lan,false);
  await assert.rejects(primary.approve('owner-token',created.id,'wrong fingerprint'));
  const waiting=await primary.state('owner-token',created.id);assert.equal(waiting.fingerprint,claimed.fingerprint);
  await primary.approve('owner-token',created.id,claimed.fingerprint);assert.equal(lan,true);assert.equal(client,null);
  assert.equal((await secondary.joinState()).state,'completed');assert(navigated);assert.equal(client.mode,'client');assert.equal(client.pairing.registerId,host.registers[0].id);
  assert.equal(JSON.stringify(job.payload).includes(host.registers[0].key),false);
  await assert.rejects(secondary.join(created.code));
});
