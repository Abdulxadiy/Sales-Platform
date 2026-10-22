const {randomBytes,randomUUID}=require('node:crypto');
const {createIdentity,fingerprint,encryptPairing,decryptPairing}=require('./pairing.cjs');
const {validatePairing}=require('./runtime.cjs');

class PairingManager {
  constructor({relay,publicRequest,getConfiguration,saveConfiguration,enableLAN,selectAddress,certificate,probe,navigate,name='Yangi kassa'}) {
    Object.assign(this,{relay,publicRequest,getConfiguration,saveConfiguration,enableLAN,selectAddress,certificate,probe,navigate,name});
    this.primaryJobs=new Map();this.joinJob=null;
  }
  hostOnly(){if(this.getConfiguration()?.mode!=='host')throw Error('Yangi ulanish kodi asosiy kassada yaratiladi.');}
  async create(token){
    this.hostOnly();
    const result=await this.relay(token,{action:'create'});
    this.primaryJobs.clear();
    this.primaryJobs.set(result.id,{...result,deadline:performance.now()+Math.min(180,result.remaining??180)*1000});
    return this.visible(this.primaryJobs.get(result.id));
  }
  visible(job){
    const remaining=Math.max(0,Math.ceil((job.deadline-performance.now())/1000));
    const state=!remaining&&job.state!=='completed'?'expired':job.state;
    return {id:job.id,state,remaining,code:state==='waiting'?job.code:undefined,clientName:job.client_name||'',
      fingerprint:job.public_key?fingerprint(job.public_key):'',registerId:job.registerId};
  }
  async state(token,id){
    this.hostOnly();
    const job=this.primaryJobs.get(id);if(!job)throw Error('Ulanish kodi topilmadi. Yangi kod yarating.');
    if(performance.now()>=job.deadline)return this.visible({...job,state:'expired'});
    const value=await this.relay(token,{action:'state',id});
    Object.assign(job,value);
    return this.visible(job);
  }
  async approve(token,id,expectedFingerprint){
    this.hostOnly();
    await this.state(token,id);
    const job=this.primaryJobs.get(id);
    if(job.state!=='claimed'||performance.now()>=job.deadline)throw Error('Kod kiritilmagan yoki muddati tugagan.');
    if(expectedFingerprint!==fingerprint(job.public_key))throw Error('Ikkala ekrandagi tasdiqlash belgisini solishtiring.');
    if(!job.envelope){
      const address=await this.selectAddress();
      const register={id:randomUUID(),name:job.client_name||'Kassa',key:randomBytes(32).toString('hex'),createdAt:new Date().toISOString()};
      const configuration=this.getConfiguration();
      const pairing={protocol:1,host:address,port:configuration.lanPort||49243,key:register.key,
        certificate:await this.certificate(),registerId:register.id};
      job.envelope=encryptPairing(pairing,job.public_key,id);job.registerId=register.id;
      await this.saveConfiguration({...configuration,registers:[...(configuration.registers||[]),register]});
      try{await this.enableLAN();}catch(error){await this.saveConfiguration(configuration);delete job.envelope;delete job.registerId;throw error;}
    }
    Object.assign(job,await this.relay(token,{action:'approve',id,payload:job.envelope}));
    return this.visible(job);
  }
  async cancel(token,id){
    this.hostOnly();
    await this.relay(token,{action:'cancel',id});
    const job=this.primaryJobs.get(id);
    if(job?.registerId&&job.state!=='completed'){
      const configuration=this.getConfiguration();
      await this.saveConfiguration({...configuration,registers:(configuration.registers||[]).filter(row=>row.id!==job.registerId)});
      await this.enableLAN();
    }
    if(job)job.state='expired';
    return job?this.visible(job):{state:'expired',remaining:0};
  }
  async join(code){
    if(this.getConfiguration()?.mode==='host')throw Error('Bu asosiy kompyuter. Undagi bazani yangi ulanish bilan almashtirib bo‘lmaydi.');
    const identity=createIdentity();
    const result=await this.publicRequest('claim',{code,public_key:identity.publicKey,name:this.name});
    this.joinJob={...result,identity,deadline:performance.now()+Math.min(180,result.remaining??180)*1000};
    return this.joinVisible();
  }
  joinVisible(){
    const job=this.joinJob;if(!job)return null;
    const remaining=Math.max(0,Math.ceil((job.deadline-performance.now())/1000));
    return {id:job.id,state:remaining?job.state:'expired',remaining,fingerprint:fingerprint(job.identity.publicKey)};
  }
  async joinState(){
    const job=this.joinJob;
    if(!job)throw Error('Avval asosiy kassadagi kodni kiriting.');
    if(performance.now()>=job.deadline){this.joinJob=null;throw Error('Kod muddati tugadi. Asosiy kassadan yangi kod oling.');}
    const result=await this.publicRequest('result',{id:job.id,claim_token:job.claim_token});
    job.state=result.state;
    if(result.state==='approved'&&result.payload){
      const pairing=validatePairing(decryptPairing(result.payload,job.identity,job.id));
      if(!pairing.registerId)throw Error('Ulanish qurilmaga bog‘lanmagan. Yangi kod bilan qayta ulang.');
      const status=await this.probe(pairing);
      if(!status.desktop||!status.enrolled)throw Error('Asosiy kassa hali offline tayyorlanmagan.');
      await this.saveConfiguration({mode:'client',pairing});
      await this.publicRequest('result',{id:job.id,claim_token:job.claim_token,complete:true}).catch(()=>{});
      await this.navigate();
      job.state='completed';
    }
    return this.joinVisible();
  }
}
module.exports={PairingManager};
