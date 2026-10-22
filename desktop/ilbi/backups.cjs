const {createCipheriv,createDecipheriv,randomBytes,createHmac,randomUUID}=require('node:crypto');
const {createReadStream,createWriteStream}=require('node:fs');
const {mkdir,readFile,writeFile,rename,rm,readdir,stat,open,chmod}=require('node:fs/promises');
const {join}=require('node:path');
const {spawn}=require('node:child_process');
const {pipeline}=require('node:stream/promises');
const {Writable}=require('node:stream');
const MAGIC=Buffer.from('ILBIBAK2');
const ROOTS=['postgres','media','cloud.credentials'];
async function journal(directory,value){
  const path=join(directory,'restore.journal');await writeFile(path+'.new',JSON.stringify(value),{mode:0o600});
  const file=await open(path+'.new','r+');try{await file.sync();}finally{await file.close();}await rename(path+'.new',path);
}
async function recoverRestore(directory){
  let value;try{value=JSON.parse(await readFile(join(directory,'restore.journal'),'utf8'));}catch(error){if(error.code==='ENOENT')return;throw error;}
  if(!/^\.restore-[a-f\d-]{36}$/.test(value.staging)||!Array.isArray(value.swapped)||value.swapped.some(row=>!ROOTS.includes(row.name)))throw Error('Tiklash holati noto‘g‘ri. Ma’lumotlar papkasini o‘chirmang.');
  const staging=join(directory,value.staging);
  if(!value.committed)for(const {name,existed} of [...value.swapped].reverse()){
    const previous=join(staging,name+'.previous');let available=false;try{await stat(previous);available=true;}catch(error){if(error.code!=='ENOENT')throw error;}
    if(available||!existed){await rm(join(directory,name),{recursive:true,force:true});if(available)await rename(previous,join(directory,name));}
  }
  await rm(staging,{recursive:true,force:true});await rm(join(directory,'restore.journal'),{force:true});
}

async function protectProfile(directory){
  await mkdir(directory,{recursive:true,mode:0o700});
  if(process.platform==='win32'){
    const {execFile}=require('node:child_process'),{promisify}=require('node:util'),exec=promisify(execFile);
    const {stdout}=await exec('whoami',['/user','/fo','csv','/nh'],{windowsHide:true});
    const sid=stdout.match(/S-1-5-[\d-]+/)?.[0];if(!sid)throw Error('Windows foydalanuvchi himoyasi aniqlanmadi.');
    // Apply container inheritance at the root. Windows propagates the proper
    // file and directory ACEs; do not rewrite every file with container flags.
    await exec('icacls',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F','/Q'],{windowsHide:true,maxBuffer:8*1024*1024});
  }else await chmod(directory,0o700);
}

class Backups{
  constructor({directory,key,python,helper,quiesce,resume,getDrafts,setDrafts,owner}){
    Object.assign(this,{directory,python,helper,quiesce,resume,getDrafts,setDrafts,owner});
    this.key=createHmac('sha256',key).update('ilbi-authenticated-backup-v2').digest();
    this.folder=join(directory,'backups');this.busy=false;this.phase='idle';this.error='';
  }
  async list(){
    await mkdir(this.folder,{recursive:true,mode:0o700});
    const entries=await Promise.all((await readdir(this.folder)).filter(id=>/^\d{13}-[a-f\d-]{36}\.ilbibak$/.test(id)).map(async id=>({id,created:Number(id.slice(0,13)),bytes:(await stat(join(this.folder,id))).size})));
    return entries.sort((a,b)=>b.created-a.created);
  }
  async status(){return {phase:this.phase,busy:this.busy,error:this.error,backups:await this.list()};}
  child(action,directory){
    const child=spawn(this.python,[this.helper,action,directory],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let error='';child.stderr.on('data',chunk=>{error=(error+chunk).slice(-2000);});
    const done=new Promise((ok,fail)=>{child.once('error',fail);child.once('close',code=>code===0?ok():fail(Error('Zaxira faylini tayyorlab bo‘lmadi: '+error)));});
    done.catch(()=>{});return {child,done};
  }
  async writeBackup(){
    this.phase='saving';await mkdir(this.folder,{recursive:true,mode:0o700});
    const id=Date.now()+'-'+randomUUID()+'.ilbibak',path=join(this.folder,id),temporary=path+'.new';
    const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,nonce);
    const header=Buffer.concat([MAGIC,nonce]);cipher.setAAD(header);
    const metadata=Buffer.from(JSON.stringify({version:2,drafts:await this.getDrafts()}));
    if(metadata.length>64*1024*1024)throw Error('Saqlanmagan rasmlar juda katta. Avval ularni saqlang.');
    const size=Buffer.alloc(4);size.writeUInt32BE(metadata.length);
    const output=createWriteStream(temporary,{mode:0o600});
    const {child,done}=this.child('pack',this.directory);child.stdin.end();
    try{
      output.write(header);output.write(cipher.update(Buffer.concat([size,metadata])));
      await Promise.all([pipeline(child.stdout,cipher,output,{end:false}),done]);
      output.end(cipher.getAuthTag());await require('node:stream/promises').finished(output);
      const handle=await open(temporary,'r+');try{await handle.sync();}finally{await handle.close();}
      await rename(temporary,path);
    }catch(error){child.kill();output.destroy();await rm(temporary,{force:true});throw error;}
    return id;
  }
  async reader(id){
    if(!(await this.list()).some(row=>row.id===id))throw Error('Zaxira topilmadi.');
    const path=join(this.folder,id),bytes=(await stat(path)).size;
    if(bytes<40)throw Error('Zaxira fayli to‘liq emas.');
    const handle=await open(path,'r');let header=Buffer.alloc(20),tag=Buffer.alloc(16);
    try{await handle.read(header,0,20,0);await handle.read(tag,0,16,bytes-16);}finally{await handle.close();}
    if(!header.subarray(0,8).equals(MAGIC))throw Error('Zaxira turi noto‘g‘ri.');
    return ()=>{const cipher=createDecipheriv('aes-256-gcm',this.key,header.subarray(8));cipher.setAAD(header);cipher.setAuthTag(tag);return {stream:createReadStream(path,{start:20,end:bytes-17}),cipher};};
  }
  async extract(id,target){
    const reader=await this.reader(id);let current=reader();
    // Authenticate the entire archive before writing any restored files.
    try{await pipeline(current.stream,current.cipher,new Writable({write(_chunk,_encoding,done){done();}}));}
    catch{throw Error('Zaxira fayli buzilgan yoki boshqa o‘rnatishga tegishli. Tiklash boshlanmadi.');}
    current=reader();const {child,done}=this.child('unpack',target);
    let buffered=Buffer.alloc(0),length=null,metadata=null;
    const strip=new (require('node:stream').Transform)({transform(chunk,_encoding,callback){
      if(metadata){callback(null,chunk);return;}
      buffered=Buffer.concat([buffered,chunk]);
      if(length===null&&buffered.length>=4){length=buffered.readUInt32BE(0);if(length>64*1024*1024){callback(Error('Zaxira metama’lumoti juda katta.'));return;}}
      if(length!==null&&buffered.length>=length+4){try{metadata=JSON.parse(buffered.subarray(4,length+4));callback(null,buffered.subarray(length+4));buffered=null;}catch(error){callback(error);}}else callback();
    }});
    try{await Promise.all([pipeline(current.stream,current.cipher,strip,child.stdin),done]);if(metadata?.version!==2)throw Error('Zaxira versiyasi noto‘g‘ri.');return metadata;}
    catch(error){child.kill();await rm(target,{recursive:true,force:true});throw error;}
  }
  async run(action){
    if(this.busy)throw Error('Zaxira bilan ishlash davom etmoqda.');
    this.busy=true;this.error='';this.phase='preparing';
    try{return await action();}catch(error){this.error=error.message;throw error;}
    finally{this.busy=false;this.phase='idle';}
  }
  async create(){return this.run(async()=>{
    try{await this.quiesce();const id=await this.writeBackup();const rows=await this.list();for(const row of rows.slice(7))await rm(join(this.folder,row.id));return id;}
    finally{await this.resume();}
  });}
  async restore(id){return this.run(async()=>{
    this.phase='checking';const staging=join(this.directory,'.restore-'+randomUUID());
    const metadata=await this.extract(id,staging);
    let rollback=null,swapped=[];
    try{
      await this.quiesce();rollback=await this.writeBackup();this.phase='restoring';
      for(const name of ROOTS){
        const original=join(this.directory,name),next=join(staging,name),previous=join(staging,name+'.previous');
        let existed=false;try{await stat(original);existed=true;}catch(error){if(error.code!=='ENOENT')throw error;}
        swapped.push({name,existed});await journal(this.directory,{staging:require('node:path').basename(staging),swapped});
        if(existed)await rename(original,previous);
        try{await rename(next,original);}catch(error){if(error.code!=='ENOENT')throw error;}
      }
      await this.resume();await this.setDrafts(metadata.drafts||{});
      await journal(this.directory,{staging:require('node:path').basename(staging),swapped,committed:true});
      for(const row of (await this.list()).slice(7))await rm(join(this.folder,row.id));
      return {restored:true,previousBackup:rollback};
    }catch(error){
      if(swapped.length){await this.quiesce().catch(()=>{});await recoverRestore(this.directory);}
      await this.resume().catch(()=>{});throw error;
    }finally{
      let pending;try{pending=JSON.parse(await readFile(join(this.directory,'restore.journal'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
      if(pending?.committed)await recoverRestore(this.directory);
      else if(!pending)await rm(staging,{recursive:true,force:true});
    }
  });}
}
module.exports={Backups,protectProfile,recoverRestore};
