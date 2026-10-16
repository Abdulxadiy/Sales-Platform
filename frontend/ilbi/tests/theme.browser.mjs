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
async function wait(b,condition){for(let i=0;i<700;i++){try{if(await b.evaluate(`Boolean(${condition})`))return;}catch{}await delay(60);}throw Error('Timeout: '+condition);}
async function open(b,path){await b.call('Page.navigate',{url:base+path});await wait(b,`document.readyState==='complete'&&(document.querySelector('#root')?.children.length||window.themeFixtures)&&!document.querySelector('.ilbi-loading')&&!document.querySelector('.ilbi-intro[open]')`);await wait(b,`window.__themePending===0&&performance.now()-window.__themeLastRequest>700`);await delay(100);assert.equal(await b.evaluate('location.pathname'),new URL(base+path).pathname,'Unexpected redirect: '+path);}
async function check(b,name,screenshot=false){const audit=await b.evaluate(expression);report.states.push({name,...audit});assert.equal(audit.primary.toUpperCase(),audit.theme==='dark'?'#F0EFEB':'#0B0909',name+' primary palette');assert.equal(audit.colorScheme,audit.theme,name+' native color scheme');if(screenshot)await writeFile(resolve(out,name+'.png'),Buffer.from((await b.call('Page.captureScreenshot',{format:'png',fromSurface:true})).data,'base64'));console.log(name+': '+audit.measured+' text nodes; '+audit.failures.length+' contrast findings');return audit;}
async function click(b,label){const condition=`[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(label)})`;await wait(b,`Boolean(${condition})`);await b.evaluate(`(${condition}).click()`);await delay(250);}
async function browserFor(role){const b=await launchBrowser({width:1440,height:1100,reducedMotion:true});await b.call('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});b.themeInit=await b.call('Page.addScriptToEvaluateOnNewDocument',{source:`{window.__themePending=0;window.__themeLastRequest=0;const realFetch=window.fetch.bind(window);window.fetch=(...args)=>{window.__themePending++;return realFetch(...args).finally(()=>{window.__themePending--;window.__themeLastRequest=performance.now();});};localStorage.setItem('ilbi_theme',window.name==='light'?'light':'dark');${role?`const d=${JSON.stringify(auth[role])};localStorage.setItem('ilbi_access_token',d.tokens.access);localStorage.setItem('ilbi_refresh_token',d.tokens.refresh);localStorage.setItem('ilbi_user',JSON.stringify(d.user));if(d.user.tenants[0])localStorage.setItem('ilbi_active_tenant:'+d.user.id,String((d.user.tenants.find(t=>t.name.includes('Markaz'))||d.user.tenants[0]).id));`:''}}`});return b;}
let b;
try{
 const plans=[['owner',['/dashboard','/pos','/catalog','/inventory','/sales','/debts','/b2b','/shifts','/my-tenants','/employees','/services','/audit','/profile','/docs','/support']],['admin',['/dashboard','/tenants','/seller-profiles/review','/employees','/audit','/support']],['staff',['/pos','/inventory','/sales','/profile']],['terms',['/accept-terms']],['guest',['/login','/support',auth._meta.resetPath,auth._meta.receiptPath]]];
 for(const [role,routes]of plans){
  b=await browserFor(role==='guest'?null:role);
  for(const theme of ['dark','light']){
   await b.evaluate(`window.name=${JSON.stringify(theme)}`);
   for(const route of routes){await open(b,route);const label=route===auth._meta.resetPath?'reset-password':route===auth._meta.receiptPath?'public-receipt':route==='/dashboard'?'dashboard':route.slice(1).replaceAll('/','-');await check(b,role+'-'+theme+'-'+label,theme==='dark'&&['dashboard','pos','support','public-receipt','accept-terms','reset-password'].includes(label));if(label==='public-receipt'){await b.call('Emulation.setEmulatedMedia',{media:'print'});assert.equal(await b.evaluate(`getComputedStyle(document.querySelector('.public-receipt-container h1')).visibility`),'visible');assert.equal(await b.evaluate(`getComputedStyle(document.querySelector('.public-receipt-container')).backgroundColor`),'rgb(255, 255, 255)');if(theme==='dark'){const pdf=await b.call('Page.printToPDF',{printBackground:true});await writeFile(resolve(out,'public-receipt-night.pdf'),Buffer.from(pdf.data,'base64'));}await b.call('Emulation.setEmulatedMedia',{media:'screen'});report.checks.push('Public receipt print: '+theme+'; visible paper on white.');}}
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
  await open(b,'/services');for(const label of ['Telegram & Bildirishnomalar','Chek & Kassa','Avtomatlashtirish & Xizmatlar']){const exists=await b.evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(label)})`);if(exists){await click(b,label);await check(b,'services-'+label.replaceAll(' ','-')+'-'+theme);}}
  await open(b,'/profile');await wait(b,`Boolean(document.querySelector('.support-launcher'))`);await b.evaluate(`document.querySelector('.support-launcher').click()`);await delay(250);await check(b,'support-widget-'+theme,true);
  await open(b,'/profile');await check(b,'profile-controls-'+theme);
  // Actual shared calendar, select, confirmation and media components rendered in a fixture host.
  const fixtureBrowser=await browserFor('owner');
  await fixtureBrowser.evaluate(`window.name=${JSON.stringify(theme)}`);
  try{
  await open(fixtureBrowser,'/tests/themeFixtures.html');
  await wait(fixtureBrowser,`Boolean(window.themeFixtures)&&document.querySelector('#theme-fixtures button')`);
  await delay(300);await check(fixtureBrowser,'shared-controls-'+theme,true);
  await fixtureBrowser.evaluate(`document.querySelector('#theme-fixtures button').click()`);await delay(200);await check(fixtureBrowser,'calendar-selected-'+theme,true);
  await fixtureBrowser.evaluate(`document.querySelector('#theme-fixtures button').click()`);await delay(100);
  await click(fixtureBrowser,'Birinchi variant');await check(fixtureBrowser,'select-menu-'+theme,true);await click(fixtureBrowser,'Birinchi variant');
  await fixtureBrowser.evaluate(`[...document.querySelectorAll('#theme-fixtures span')].find(b=>b.textContent==='Katalog va Mahsulotlar').click()`);await delay(150);await check(fixtureBrowser,'permissions-expanded-'+theme,true);
  for(const type of ['info','success','warning','danger']){
   await fixtureBrowser.evaluate(`(()=>{const{React,root,Confirm}=window.themeFixtures;root.render(React.createElement(Confirm,{isOpen:true,options:{type:${JSON.stringify(type)},message:'Mavzu ranglarini tekshirish'},onCancel:()=>{},onConfirm:()=>{}}))})()`);
   await delay(180);await check(fixtureBrowser,'confirmation-'+type+'-'+theme,true);
  }
  await fixtureBrowser.evaluate(`(()=>{const{React,root,Loading}=window.themeFixtures;root.render(React.createElement(Loading,{message:'Sahifa yuklanmoqda...'}))})()`);
  await wait(fixtureBrowser,`Boolean(document.querySelector('.ilbi-loading'))`);await check(fixtureBrowser,'loading-'+theme,true);
  await fixtureBrowser.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await fixtureBrowser.evaluate(`(()=>{const{React,root,Intro}=window.themeFixtures;root.render(React.createElement(Intro,{onComplete:()=>{}}))})()`);
  await wait(fixtureBrowser,`Boolean(document.querySelector('.ilbi-intro[open] .ilbi-intro__stage svg'))`);await delay(3600);
  const introInk=await fixtureBrowser.evaluate(`getComputedStyle(document.querySelector('.ilbi-intro__stage linearGradient[id$="-ink"] stop')).stopColor`);
  assert.equal(introInk,theme==='dark'?'rgb(240, 239, 235)':'rgb(11, 9, 9)');await check(fixtureBrowser,'intro-'+theme,true);
  await fixtureBrowser.evaluate(`window.themeFixtureRoot.unmount();document.querySelector('#theme-fixtures').remove()`);
  }finally{report.browserErrors.push(...fixtureBrowser.errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT')));await fixtureBrowser.close();}
  await b.resize(390,844);
  for(const route of ['/pos','/catalog','/inventory','/employees','/support','/profile']){await open(b,route);await check(b,'mobile-'+theme+'-'+route.slice(1),['/pos','/support'].includes(route));}
  await b.resize(1440,1100);
 }
 // Toggle via the real UI, then reload to verify persisted theme and the first render.
 await open(b,'/dashboard');await b.evaluate(`document.querySelector('[aria-label="Mavzuni almashtirish"]').click()`);await delay(100);
 assert.equal(await b.evaluate('document.documentElement.dataset.theme'),'dark');
 // Remove the test-only window.name initializer before the persistence reload.
 await b.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:b.themeInit.identifier});
 await b.call('Page.reload');await delay(900);assert.equal(await b.evaluate('document.documentElement.dataset.theme'),'dark');
 report.checks.push('Real theme toggle, reload persistence, native color scheme, all role routes, modals, shared controls, mobile widths.');
 report.browserErrors.push(...b.errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT')));await b.close();b=null;
}finally{
 if(b){report.browserErrors.push(...b.errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT')));await b.close();}
 report.totalStates=report.states.length;report.totalTextMeasurements=report.states.reduce((n,s)=>n+s.measured,0);report.contrastFindings=report.states.filter(s=>s.failures.length).map(s=>({name:s.name,failures:s.failures}));
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}
assert.deepEqual(report.states.filter(s=>s.clippedHeaderControls?.length).map(s=>s.name),[],'Clipped mobile header controls');
assert.deepEqual(report.states.filter(s=>s.horizontalOverflow).map(s=>s.name),[],'Horizontal overflow');
assert.deepEqual(report.browserErrors,[],'Browser/API errors');
assert.deepEqual(report.contrastFindings,[],'Text contrast findings; see report.json');
console.log('Theme QA passed:',report.totalStates,'states,',report.totalTextMeasurements,'text measurements.');
