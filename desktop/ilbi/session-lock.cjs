const {readFile,writeFile,rm,mkdir}=require('node:fs/promises');
const {join}=require('node:path');
function activityClock(){
  let wall=Date.now(),mono=performance.now(),elapsed=0;
  return ()=>{const nextWall=Date.now(),nextMono=performance.now();elapsed+=Math.max(0,nextWall-wall,nextMono-mono);wall=nextWall;mono=nextMono;return elapsed;};
}

class SessionLock {
  constructor({directory,authorize,onLock,clock=activityClock()}){
    Object.assign(this,{directory,authorize,onLock,clock});this.path=join(directory,'session.lock');
    this.locked=false;this.active=null;this.lastActivity=0;this.idleMinutes=10;this.pending=Promise.resolve();this.generation=0;
  }
  async initialize(){try{await readFile(this.path);this.locked=true;}catch(error){if(error.code!=='ENOENT')throw error;}}
  async activate(token){
    if(this.locked)throw Error('Kassa qulflangan. Hisobingizni tasdiqlang.');
    const generation=this.generation,profile=await this.authorize(token);
    if(this.locked||this.generation!==generation)return false;
    if(!this.active||this.active.user!==profile.id)this.lastActivity=this.clock();
    this.active={token,user:profile.id};return true;
  }
  touch(){if(this.active&&!this.locked)this.lastActivity=this.clock();}
  change(action){const next=this.pending.catch(()=>{}).then(action);this.pending=next.catch(()=>{});return next;}
  lock(token){
    this.generation++;this.locked=true;const active=token||this.active?.token;this.active=null;
    return this.change(async()=>{
      await mkdir(this.directory,{recursive:true,mode:0o700});await writeFile(this.path,'locked\n',{mode:0o600});
      await this.onLock(active).catch(()=>{});return true;
    });
  }
  // Called only after a successful local unlock or cloud-password verification response.
  unlock(){
    this.generation++;this.locked=false;this.lastActivity=this.clock();
    return this.change(()=>rm(this.path,{force:true}));
  }
  async check(){if(this.active&&!this.locked&&this.clock()-this.lastActivity>=this.idleMinutes*60000)await this.lock();return this.locked;}
}
module.exports={SessionLock};
