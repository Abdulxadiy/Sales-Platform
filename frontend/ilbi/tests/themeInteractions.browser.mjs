import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {launchBrowser} from './browser/chrome.mjs';
import {auditTheme} from './helpers/themeAudit.js';
const auth=JSON.parse(await readFile(process.env.ILBI_THEME_AUTH_FILE,'utf8'));
assert.equal(auth._meta.synthetic,true);
const base=process.env.ILBI_THEME_BASE_URL||auth._meta.origin;
assert.equal(base,auth._meta.origin);
const out=resolve('../../branding/ilbi-motion-studio/qa/night-theme');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const b=await launchBrowser({width:1440,height:1000,reducedMotion:true});
const results=[];
try{
 await b.call('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
 await b.call('Page.addScriptToEvaluateOnNewDocument',{source:`{localStorage.setItem('ilbi_theme',window.name==='light'?'light':'dark');window.pending=0;window.lastRequest=0;const f=window.fetch.bind(window);window.fetch=(...a)=>{window.pending++;return f(...a).finally(()=>{window.pending--;window.lastRequest=performance.now()})};if(location.origin===${JSON.stringify(base)}){const d=${JSON.stringify(auth.owner)};localStorage.setItem('ilbi_access_token',d.tokens.access);localStorage.setItem('ilbi_refresh_token',d.tokens.refresh);localStorage.setItem('ilbi_user',JSON.stringify(d.user));localStorage.setItem('ilbi_active_tenant:'+d.user.id,String(d.user.tenants.find(t=>t.name.includes('Markaz')).id));}}`});
 async function settled(){for(let i=0;i<300;i++){if(await b.evaluate(`Boolean(document.querySelector('.app-header'))&&pending===0&&performance.now()-lastRequest>700&&!document.querySelector('.ilbi-loading')`))return;await wait(50);}throw Error('Page did not settle.');}
 async function open(path){await b.call('Page.navigate',{url:base+path});await settled();}
 async function check(name){await wait(150);const audit=await b.evaluate(`(${auditTheme.toString()})()`);assert.deepEqual(audit.failures,[],name+' contrast: '+JSON.stringify(audit.failures));results.push({name,...audit});}
 async function click(label){const selector=`[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim().startsWith(${JSON.stringify(label)}))`;assert.equal(await b.evaluate(`Boolean(${selector})`),true,'Missing '+label);await b.evaluate(`(${selector}).click()`);await settled();}
 for(const theme of ['dark','light']){
  await b.evaluate(`window.name=${JSON.stringify(theme)}`);
  await b.call('Page.navigate',{url:base+'/tests/themeFixtures.html'});
  for(let i=0;i<100;i++){if(await b.evaluate('Boolean(window.themeFixtures)'))break;await wait(50);}
  for(const type of ['info','success','warning','danger']){
   await b.evaluate(`(()=>{const{React,root,Confirm}=window.themeFixtures;root.render(React.createElement(Confirm,{isOpen:true,options:{type:${JSON.stringify(type)},message:'Hover va fokus ranglari'},onConfirm:()=>{},onCancel:()=>{}}))})()`);
   await wait(150);
   const pos=await b.evaluate(`(()=>{const e=[...document.querySelectorAll('dialog[open] button')].at(-1),r=e.getBoundingClientRect();e.focus();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos.x,y:pos.y});
   await wait(250);
   const audit=await b.evaluate(`(${auditTheme.toString()})()`);
   assert.deepEqual(audit.failures,[],theme+' '+type+' hover/focus contrast');
   results.push({theme,type,measured:audit.measured,failures:audit.failures});
   await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:2,y:2});
  }
 }
 for(const theme of ['dark','light']){
  await b.evaluate(`window.name=${JSON.stringify(theme)}`);
  await open('/inventory');
  for(const label of ['Transferlar','Kamchiliklar','Harakatlar','Partiyalar va yaroqlilik']){await click(label);await check('inventory-'+label+'-'+theme);}
  await open('/debts');await click('Haqqi Borlar');await check('credit-filter-'+theme);
  for(const label of ['+ Kassaga Kirim','- Kassadan Chiqim','Smenani Yopish (Z-Report)']){await open('/shifts');await click(label);await check('cashbox-'+label+'-'+theme);}
 }
 const live=process.env.ILBI_THEME_LIVE_URL;
 let liveResult;
 if(live){
  await b.evaluate(`window.name='dark'`);
  await b.call('Page.navigate',{url:live+'/login'});
  for(let i=0;i<200;i++){if(await b.evaluate(`Boolean(document.querySelector('#username'))&&!document.querySelector('.ilbi-intro[open]')`))break;await wait(70);}
  liveResult=await b.evaluate(`(${auditTheme.toString()})()`);
  assert.equal(liveResult.primary,'#F0EFEB');assert.equal(liveResult.background,'#0B0909');assert.deepEqual(liveResult.failures,[]);
  await writeFile(resolve(out,'live-night-login.png'),Buffer.from((await b.call('Page.captureScreenshot',{format:'png',fromSurface:true})).data,'base64'));
 }
 const errors=b.errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT'));
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'interactions.json'),JSON.stringify({states:results,live:liveResult,browserErrors:errors},null,2)+'\n');
 console.log('Hover/focus:',results.length,'states passed. Live UI:',liveResult?.theme||'not requested');
}finally{await b.close();}
