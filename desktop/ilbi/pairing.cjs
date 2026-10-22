const {generateKeyPairSync,createPublicKey,diffieHellman,hkdfSync,createCipheriv,createDecipheriv,randomBytes,createHash} = require('node:crypto');
const prefix=Buffer.from('302a300506032b656e032100','hex');

function publicBytes(value) {
  if(typeof value!=='string'||value.length>100)throw Error('Ulanish kaliti noto‘g‘ri.');
  const data=Buffer.from(value,'base64');
  if(data.length!==32||data.equals(Buffer.alloc(32)))throw Error('Ulanish kaliti noto‘g‘ri.');
  return data;
}
function createIdentity() {
  const {privateKey,publicKey}=generateKeyPairSync('x25519');
  return {privateKey,publicKey:publicKey.export({type:'spki',format:'der'}).subarray(-32).toString('base64')};
}
function fingerprint(value) {
  const hex=createHash('sha256').update(publicBytes(value)).digest('hex').slice(0,8).toUpperCase();
  return hex.slice(0,4)+' '+hex.slice(4);
}
function keyFor(privateKey,peer,id) {
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))throw Error('Ulanish identifikatori noto‘g‘ri.');
  const publicKey=createPublicKey({key:Buffer.concat([prefix,publicBytes(peer)]),type:'spki',format:'der'});
  return hkdfSync('sha256',diffieHellman({privateKey,publicKey}),Buffer.from(id),'ilbi-register-pairing-v1',32);
}
function encryptPairing(value,peer,id) {
  const identity=createIdentity(),nonce=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',keyFor(identity.privateKey,peer,id),nonce);
  cipher.setAAD(Buffer.from(id));
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return {public_key:identity.publicKey,nonce:nonce.toString('base64'),ciphertext:ciphertext.toString('base64'),tag:cipher.getAuthTag().toString('base64')};
}
function decryptPairing(envelope,identity,id) {
  if(!envelope||typeof envelope.ciphertext!=='string'||envelope.ciphertext.length>16000)throw Error('Ulanish ma’lumoti noto‘g‘ri.');
  const nonce=Buffer.from(envelope.nonce||'','base64'),tag=Buffer.from(envelope.tag||'','base64');
  if(nonce.length!==12||tag.length!==16)throw Error('Ulanish imzosi noto‘g‘ri.');
  const cipher=createDecipheriv('aes-256-gcm',keyFor(identity.privateKey,envelope.public_key,id),nonce);
  cipher.setAAD(Buffer.from(id));cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(envelope.ciphertext,'base64')),cipher.final()]).toString('utf8'));
}
module.exports={createIdentity,fingerprint,encryptPairing,decryptPairing};
