import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {launchBrowser} from './browser/chrome.mjs';
import {auditTheme} from './helpers/themeAudit.js';
const authFile=process.env.ILBI_THEME_AUTH_FILE;
assert.ok(authFile,'ILBI_THEME_AUTH_FILE must identify isolated synthetic accounts.');
const auth=JSON.parse(await readFile(authFile,'utf8'));
assert.equal(auth._meta?.synthetic,true,'Real accounts are prohibited in theme QA.');
const base=process.env.ILBI_THEME_BASE_URL||'http://127.0.0.1:5177';
assert.equal(auth._meta.origin,base);
const out=resolve(process.env.ILBI_THEME_QA_DIR||'../../branding/ilbi-motion-studio/qa/night-theme');
await mkdir(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const report={source:'Real React UI + isolated PostgreSQL/Redis synthetic fixtures',checks:[],states:[],browserErrors:[]};
const expression=`(${auditTheme.toString()})()`;
async function wait(b,condition){for(let i=0;i<700;i++){try{if(await b.evaluate(condition))return;}catch{}await delay(60);}throw Error('Timeout: '+condition);}
async function open(b,path){await b.call('Page.navigate',{url:base+path});await wait(b,`document.readyState==='complete'&&(document.querySelector('#root')?.children.length||window.themeFixtures)&&!document.querySelector('.ilbi-loading')&&!document.querySelector('.ilbi-intro[open]')`);await wait(b,`window.__themePending===0`);await delay(300);}
async function check(b,name,screenshot=false){const audit=await b.evaluate(expression);report.states.push({name,...audit});assert.equal(audit.colorScheme,audit.theme,name+' native color scheme');if(screenshot)await writeFile(resolve(out,name+'.png'),Buffer.from((await b.call('Page.captureScreenshot',{format:'png',fromSurface:true})).data,'base64'));console.log(name+': '+audit.measured+' text nodes; '+audit.failures.length+' contrast findings');return audit;}
async function click(b,label){const condition=`[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(label)})`;await wait(b,`Boolean(${condition})`);await b.evaluate(`(${condition}).click()`);await delay(250);}
async function browserFor(role){const b=await launchBrowser({width:1440,height:1100,reducedMotion:true});await b.call('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});b.themeInit=await b.call('Page.addScriptToEvaluateOnNewDocument',{source:`{window.__themePending=0;const realFetch=window.fetch.bind(window);window.fetch=(...args)=>{window.__themePending++;return realFetch(...args).finally(()=>window.__themePending--);};localStorage.setItem('ilbi_theme',window.name==='light'?'light':'dark');${role?`const d=${JSON.stringify(auth[role])};localStorage.setItem('ilbi_access_token',d.tokens.access);localStorage.setItem('ilbi_refresh_token',d.tokens.refresh);localStorage.setItem('ilbi_user',JSON.stringify(d.user));if(d.user.tenants[0])localStorage.setItem('ilbi_active_tenant:'+d.user.id,String((d.user.tenants.find(t=>t.name.includes('Markaz'))||d.user.tenants[0]).id));`:''}}`});return b;}
let b;
try{
 const plans=[['owner',['/','/pos','/catalog','/inventory','/sales','/debts','/b2b','/shifts','/my-tenants','/employees','/services','/audit','/profile','/docs','/support']],['admin',['/','/tenants','/seller-profiles/review','/employees','/audit','/support']],['staff',['/pos','/inventory','/sales','/profile']],['terms',['/accept-terms']],['guest',['/login','/support',auth._meta.resetPath,auth._meta.receiptPath]]];
 for(const [role,routes]of plans){
  b=await browserFor(role==='guest'?null:role);
  for(const theme of ['dark','light']){
   await b.evaluate(`window.name=${JSON.stringify(theme)}`);
   for(const route of routes){await open(b,route);const label=route===auth._meta.resetPath?'reset-password':route===auth._meta.receiptPath?'public-receipt':route==='/'?'dashboard':route.slice(1).replaceAll('/','-');await check(b,role+'-'+theme+'-'+label,theme==='dark'&&['dashboard','pos','support','public-receipt','accept-terms','reset-password'].includes(label));}
  }
  report.browserErrors.push(...b.errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT')));await b.close();b=null;
 }
 // Exercise real controls and overlay states under both palettes using an owner session.
 b=await browserFor('owner');
 for(const theme of ['dark','light']){
  await b.evaluate(`window.name=${JSON.stringify(theme)}`);
  await open(b,'/pos');await wait(b,`document.querySelectorAll('.glass-card.interactive').length>2`);
  await b.evaluate(`document.querySelector('.glass-card.interactive').click()`);await delay(200);
  await check(b,'checkout-cart-'+theme,true);
  await click(b,'To‘lovga O‘tish');await check(b,'checkout-modal-'+theme,true);
  await open(b,'/catalog');await click(b,'Yangi Tovar');await check(b,'catalog-modal-'+theme,true);
  await open(b,'/inventory');await click(b,'+ Tovar Kirimi');await check(b,'intake-modal-'+theme,true);
  await open(b,'/employees');await click(b,'Xodim qo‘shish');await check(b,'employee-modal-'+theme,true);
  await open(b,'/services');for(const label of ['Telegram','Chek','Avtomatlashtirish']){const exists=await b.evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)})`);if(exists){await click(b,label);await check(b,'services-'+label+'-'+theme);}}
  await open(b,'/profile');await check(b,'profile-controls-'+theme);
  // Actual shared calendar, select, confirmation and media components rendered in a fixture host.
  await open(b,'/tests/themeFixtures.html');
  await wait(b,`Boolean(window.themeFixtures)&&document.querySelector('#theme-fixtures button')`);
  await delay(300);await check(b,'shared-controls-'+theme,true);
  await b.evaluate(`document.querySelector('#theme-fixtures button').click()`);await delay(200);await check(b,'calendar-selected-'+theme,true);
  await b.evaluate(`document.querySelector('#theme-fixtures button').click()`);await delay(100);
  for(const type of ['info','success','warning','danger']){
   await b.evaluate(`(()=>{const{React,root,Confirm}=window.themeFixtures;root.render(React.createElement(Confirm,{isOpen:true,options:{type:${JSON.stringify(type)},message:'Mavzu ranglarini tekshirish'},onCancel:()=>{},onConfirm:()=>{}}))})()`);
   await delay(180);await check(b,'confirmation-'+type+'-'+theme,true);
  }
  await b.evaluate(`window.themeFixtureRoot.unmount();document.querySelector('#theme-fixtures').remove()`);
  await b.resize(390,844);
  for(const route of ['/pos','/catalog','/inventory','/employees','/support','/profile']){await open(b,route);await check(b,'mobile-'+theme+'-'+route.slice(1),['/pos','/support'].includes(route));}
  await b.resize(1440,1100);
 }
 // Toggle via the real UI, then reload to verify persisted theme and the first render.
 await open(b,'/');await b.evaluate(`document.querySelector('[aria-label="Mavzuni almashtirish"]').click()`);await delay(100);
 assert.equal(await b.evaluate('document.documentElement.dataset.theme'),'dark');
 // Remove the test-only window.name initializer before the persistence reload.
 await b.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:b.themeInit.identifier});
 await b.call('Page.reload');await delay(900);assert.equal(await b.evaluate('document.documentElement.dataset.theme'),'dark');
 report.checks.push('Real theme toggle, reload persistence, native color scheme, all role routes, modals, shared controls, mobile widths.');
 report.browserErrors.push(...b.errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT')));await b.close();b=null;
}finally{
 if(b)await b.close();
 report.totalStates=report.states.length;report.totalTextMeasurements=report.states.reduce((n,s)=>n+s.measured,0);report.contrastFindings=report.states.filter(s=>s.failures.length).map(s=>({name:s.name,failures:s.failures}));
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}
assert.deepEqual(report.browserErrors,[],'Browser/API errors');
assert.deepEqual(report.contrastFindings,[],'Text contrast findings; see report.json');
console.log('Theme QA passed:',report.totalStates,'states,',report.totalTextMeasurements,'text measurements.');
