const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createIdentity,fingerprint,encryptPairing,decryptPairing}=require('../pairing.cjs');

test('only the requesting register can decrypt owner-approved provisioning',()=>{
  const identity=createIdentity(),other=createIdentity(),id=randomUUID();
  const value={host:'192.168.1.2',key:'synthetic-private-register-key',registerId:randomUUID()};
  const encrypted=encryptPairing(value,identity.publicKey,id);
  assert.equal(fingerprint(identity.publicKey).length,9);
  assert.equal(JSON.stringify(encrypted).includes(value.key),false);
  assert.deepEqual(decryptPairing(encrypted,identity,id),value);
  assert.throws(()=>decryptPairing(encrypted,other,id));
  assert.throws(()=>decryptPairing(encrypted,identity,randomUUID()));
  const tampered={...encrypted,tag:Buffer.alloc(16).toString('base64')};
  assert.throws(()=>decryptPairing(tampered,identity,id));
});
test('invalid or all-zero peer keys never provision a register',()=>{
  for(const value of ['',Buffer.alloc(32).toString('base64'),'bad']) {
    assert.throws(()=>encryptPairing({},value,randomUUID()));
  }
});
