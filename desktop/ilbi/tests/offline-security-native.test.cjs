const test=require('node:test'),assert=require('node:assert/strict');
const {mkdtemp,readFile,writeFile,mkdir,rm}=require('node:fs/promises');
const {join}=require('node:path'),{tmpdir}=require('node:os'),{randomBytes}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {startHost,OFFICIAL_SERVER}=require('../runtime.cjs');
const {Backups,protectProfile}=require('../backups.cjs');

test('installed native account unlock, durable locks and encrypted PostgreSQL restore preserve pending work',{
  skip:!process.env.ILBI_DESKTOP_TEST_RESOURCES,timeout:240000,
},async()=>{
  const resources=process.env.ILBI_DESKTOP_TEST_RESOURCES,directory=await mkdtemp(join(tmpdir(),'ilbi-security-native-'));
  const executable=join(resources,process.platform==='win32'?'backend/python/python.exe':'backend/python/bin/python3');
  const runtime=join(resources,'backend/runtime.py'),application=join(resources,'backend/app');
  const secrets={djangoSecret:randomBytes(48).toString('hex'),databasePassword:randomBytes(32).toString('hex'),vaultKey:randomBytes(32).toString('base64url')+'='},bridgeKey=randomBytes(32).toString('hex');
  // Synthetic QA cloud is offline. No production switches or real store requests.
  const wrapper=`import runpy,requests\ndef offline(*args,**kwargs): raise requests.ConnectionError('Synthetic QA disconnected')\nrequests.sessions.Session.request=offline\nrunpy.run_path(${JSON.stringify(runtime)},run_name='__main__')`;
  const options={resources,dataDir:directory,secrets,bridgeKey,server:OFFICIAL_SERVER,executable,runtimeArguments:['-c',wrapper]};
  let host,drafts={local:{'ilbi_account_draft:1:1:pos_cart':'kept-cart'},files:[]};
  async function launch(){host=await startHost(options);}
  async function api(path,token,body){const response=await fetch(`http://127.0.0.1:${host.port}${path}`,{method:body===undefined?'GET':'POST',headers:{'X-ILBI-Desktop-Key':bridgeKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,data:await response.json()};}
  async function python(code){const port=(await readFile(join(directory,'postgres/postmaster.pid'),'utf8')).split('\n')[3];return execFileSync(executable,['-c',`import os,sys;sys.path.insert(0,${JSON.stringify(application)});os.environ['DJANGO_SETTINGS_MODULE']='config.settings_desktop';import django;django.setup();\n`+code],{env:{...process.env,ILBI_DESKTOP_DATA:directory,ILBI_DESKTOP_SECRET:secrets.djangoSecret,ILBI_DESKTOP_VAULT_KEY:secrets.vaultKey,ILBI_DESKTOP_BRIDGE_KEY:bridgeKey,ILBI_DESKTOP_DB_PASSWORD:secrets.databasePassword,ILBI_DESKTOP_DB_PORT:port},encoding:'utf8'}).trim();}
  try{
    await protectProfile(directory);await launch();
    await python(`from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.accounts.models import Employee
from apps.desktop_sync.models import SyncDevice,LocalOperation
from apps.desktop_sync.local import set_state
from apps.desktop_sync.security import remember_pending,pending_for
from apps.desktop_sync.account_access import save_actor
from apps.desktop_sync.grants import issue_grant,public_key
from django.test import override_settings
from django.utils import timezone
from datetime import timedelta
u=get_user_model().objects.create(username='native-owner',phone_number='+998900000001',role='owner')
t=Tenant.objects.create(owner=u,name='Synthetic native QA',public_code='NATIVE-QA')
Employee.objects.create(user=u,tenant=t,is_owner=True)
d=SyncDevice.objects.create(user_id=u.pk,tenant_id=t.pk,token_version=u.token_version,name='QA',lease_until=timezone.now()+timedelta(days=7))
set_state('device',{'device_id':str(d.pk),'tenant_id':t.pk,'user_id':u.pk,'lease_until':d.lease_until.isoformat()})
remember_pending(u.pk,u.username,'synthetic-ordinary-account-password','synthetic-proof')
with override_settings(DESKTOP_MODE=False):
 result={'user_id':u.pk,'actor_ticket':'synthetic-ticket','offline_grant':issue_grant(d,u),'grant_key':public_key(),'lease_until':d.lease_until.isoformat()}
save_actor(result,pending_for(u.pk),'Bearer synthetic-access','synthetic-refresh','primary')
LocalOperation.objects.create(user_id=u.pk,tenant_id=t.pk,title='Native unsent sale',payload={})
`);
    let result=await api('/desktop/unlock/',null,{username:'native-owner',password:'synthetic-ordinary-account-password'});assert.equal(result.status,200);let token=result.data.access;
    assert.equal((await api('/desktop/queue/',token)).data.operations.length,1);
    assert.equal((await api('/desktop/lock/',token,{})).status,200);
    assert.equal((await api('/desktop/queue/',token)).status,423);
    assert.equal((await api('/desktop/unlock/',null,{username:'native-owner',password:'wrong'})).status,400);
    result=await api('/desktop/unlock/',null,{username:'native-owner',password:'synthetic-ordinary-account-password'});assert.equal(result.status,200);token=result.data.access;
    await mkdir(join(directory,'media'),{recursive:true});await writeFile(join(directory,'media/native-image'),'synthetic-original-image');
    const backup=new Backups({directory,key:secrets.vaultKey,python:executable,helper:join(resources,'backend/backup_store.py'),
      quiesce:async()=>{if(host){await host.stop();host=null;}},resume:async()=>{if(!host)await launch();},getDrafts:async()=>drafts,setDrafts:async value=>{drafts=value;}});
    const id=await backup.create();
    await python("from apps.desktop_sync.models import LocalOperation;LocalOperation.objects.all().delete()");
    await writeFile(join(directory,'media/native-image'),'later-image');drafts={local:{},files:[]};
    await backup.restore(id);
    assert.equal((await api('/desktop/queue/',token)).data.operations.length,1);
    assert.equal(await readFile(join(directory,'media/native-image'),'utf8'),'synthetic-original-image');assert.equal(drafts.local['ilbi_account_draft:1:1:pos_cart'],'kept-cart');
    await api('/desktop/register-start/',null,{});assert.equal((await api('/desktop/queue/',token)).status,423);
    result=await api('/desktop/unlock/',null,{username:'native-owner',password:'synthetic-ordinary-account-password'});assert.equal(result.status,200);
    assert.equal((await api('/desktop/queue/',result.data.access)).data.operations.length,1);
  }finally{await host?.stop();await rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:300});}
});
