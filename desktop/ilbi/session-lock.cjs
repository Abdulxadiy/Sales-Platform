const {readFile,writeFile,rm,mkdir}=require('node:fs/promises');
const {join}=require('node:path');
function activityClock(){
  let wall=Date.now(),mono=performance.now(),elapsed=0;
  return ()=>{const nextWall=Date.now(),nextMono=performance.now();elapsed+=Math.max(0,nextWall-wall,nextMono-mono);wall=nextWall;mono=nextMono;return elapsed;};
}

class SessionLock {
  constructor({directory,authorize,onLock,clock=activityClock(),wallClock=Date.now}){
    Object.assign(this,{directory,authorize,onLock,clock,wallClock});this.path=join(directory,'session.lock');
    this.locked=false;this.reason=null;this.active=null;this.mfaDeadline=null;this.lastActivity=0;this.idleMinutes=10;this.pending=Promise.resolve();this.generation=0;
  }
  async initialize(){try{const value=(await readFile(this.path,'utf8')).trim();this.locked=true;try{this.reason=JSON.parse(value).reason||'idle';}catch{this.reason=value==='locked'?'manual':'idle';}}catch(error){if(error.code!=='ENOENT')throw error;}}
  async activate(token){
    if(this.locked)throw Error('Kassa qulflangan. Hisobingizni tasdiqlang.');
    const generation=this.generation,profile=await this.authorize(token);
    if(this.locked||this.generation!==generation)return false;
    const changed=!this.active||this.active.user!==profile.id;
    if(changed)this.lastActivity=this.clock();
    let expires;try{const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));expires=claims.desktop_mfa_expires??claims.mfa_expires_at;}catch{}
    const deadline=Number.isSafeInteger(expires)?this.clock()+expires*1000-this.wallClock():null;
    this.mfaDeadline=changed||this.mfaDeadline===null?deadline:deadline===null?this.mfaDeadline:Math.min(this.mfaDeadline,deadline);
    this.active={token,user:profile.id};return true;
  }
  touch(){if(this.active&&!this.locked)this.lastActivity=this.clock();}
  change(action){const next=this.pending.catch(()=>{}).then(action);this.pending=next.catch(()=>{});return next;}
  lock(token,reason='manual'){
    if(!this.locked||!['idle','explicit'].includes(this.reason))this.reason=reason;
    this.generation++;this.locked=true;const active=token||this.active?.token;this.active=null;
    return this.change(async()=>{
      await mkdir(this.directory,{recursive:true,mode:0o700});await writeFile(this.path,JSON.stringify({version:1,reason:this.reason})+'\n',{mode:0o600});
      await this.onLock(active).catch(()=>{});return true;
    });
  }
  // Called only after a successful local unlock or cloud-password verification response.
  unlock(){
    this.generation++;this.locked=false;this.reason=null;this.mfaDeadline=null;this.lastActivity=this.clock();
    return this.change(()=>rm(this.path,{force:true}));
  }
  async check(){if(this.active&&!this.locked){if(this.mfaDeadline!==null&&this.clock()>=this.mfaDeadline)await this.lock(undefined,'mfa_expired');else if(this.clock()-this.lastActivity>=this.idleMinutes*60000)await this.lock(undefined,'idle');}return this.locked;}
}
module.exports={SessionLock};
