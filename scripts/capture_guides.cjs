// Run only against an isolated preview with synthetic documentation fixtures.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'); const path=require('path');
const root=path.resolve(__dirname, '..');
const baseUrl=process.env.INVENTRA_DOCS_BASE_URL || 'http://127.0.0.1:5177';
const authFile=process.env.INVENTRA_DOCS_AUTH_FILE;
if (!authFile) throw new Error('Set INVENTRA_DOCS_AUTH_FILE to synthetic demo sessions; never use real accounts.');
const captureDate=new Date().toISOString().slice(0,10);
const out=path.join(root,'docs/rasmlar/focused'); const auth=JSON.parse(fs.readFileSync(authFile,'utf8'));
const manifest=[];
async function contextFor(browser, name){const c=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1.5});if(name) await c.addInitScript(d=>{localStorage.setItem('inventra_access_token',d.tokens.access);localStorage.setItem('inventra_refresh_token',d.tokens.refresh);localStorage.setItem('inventra_user',JSON.stringify(d.user));localStorage.setItem(`inventra_active_tenant:${d.user.id}`,'1');},auth[name]);return c;}
async function open(page,route){await page.goto(baseUrl+route);await page.waitForTimeout(650);}
async function capture(page,name,region,targets){
 await page.waitForTimeout(300);
 let r=typeof region==='object'&&'x'in region?region:await region.boundingBox(); if(!r)throw Error('No crop '+name);
 if(name==='catalog_create')r.height=Math.min(465,r.height);
 const marks=[];for(const [locator,label]of targets){await locator.first().waitFor({state:'visible'});const b=await locator.first().boundingBox();marks.push({b,label});}
 if(['catalog_tools','login_fields'].includes(name)) {
   const x=Math.min(...marks.map(m=>m.b.x)), y=Math.min(...marks.map(m=>m.b.y));
   r={x,y,width:Math.max(...marks.map(m=>m.b.x+m.b.width))-x,height:Math.max(...marks.map(m=>m.b.y+m.b.height))-y};
 }
 const x=Math.min(r.x,...marks.map(m=>m.b.x)),y=Math.min(r.y,...marks.map(m=>m.b.y));
 const right=Math.max(r.x+r.width,...marks.map(m=>m.b.x+m.b.width)),bottom=Math.max(r.y+r.height,...marks.map(m=>m.b.y+m.b.height));
 const clip={x:Math.max(0,x-18),y:Math.max(0,y-65),width:right-x+36,height:bottom-y+95};
 const view=page.viewportSize();clip.width=Math.min(clip.width,view.width-clip.x);clip.height=Math.min(clip.height,view.height-clip.y);
 await page.evaluate(({marks,clip})=>{
  document.querySelector('#docs-annotations')?.remove();
  const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.id='docs-annotations';svg.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;overflow:visible';
  svg.innerHTML='<defs><marker id="docs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#e85524"/></marker></defs>';
  const el=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text)e.textContent=text;svg.appendChild(e)};
  marks.forEach(({b,label},i)=>{
   el('rect',{x:b.x-3,y:b.y-3,width:b.width+6,height:b.height+6,rx:7,fill:'none',stroke:'#e85524','stroke-width':2.5});
   const width=Math.min(240,label.length*7+44),lx=Math.max(clip.x+8,Math.min(clip.x+clip.width-width-8, b.x));
   let ly=Math.max(clip.y+6,b.y-54); 
   const endX=Math.min(b.x+b.width-8,Math.max(b.x+8,lx+width/2));
   el('path',{d:`M ${lx+width/2} ${ly+29} L ${endX} ${b.y-6}`,fill:'none',stroke:'#e85524','stroke-width':2.5,'marker-end':'url(#docs-arrow)'});
   el('rect',{x:lx,y:ly,width,height:28,rx:8,fill:'#ffdf65',stroke:'#d8a826','stroke-width':1});
   el('text',{x:lx+11,y:ly+19,fill:'#201a0f','font-family':'Arial,sans-serif','font-size':13,'font-weight':700},`${i+1}. ${label}`);
  });
  // Native dialogs occupy the top layer, so their annotations belong there too.
  (document.querySelector('dialog[open]')||document.body).appendChild(svg);
 },{marks,clip});
 await page.screenshot({path:path.join(out,name+'.png'),clip});await page.evaluate(()=>document.querySelector('#docs-annotations')?.remove());
 manifest.push({file:name+'.png',route:new URL(page.url()).pathname,crop:clip,annotations:targets.map(t=>t[1]),captured:captureDate,data:'synthetic'});console.log('Captured '+name);
}
(async()=>{const browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),args:['--no-sandbox']});const c=await contextFor(browser,'demo_owner');const p=await c.newPage();
 await open(p,'/catalog');
 await capture(p,'catalog_tools',{x:750,y:105,width:650,height:120},[[p.getByRole('button',{name:'Fayldan yuklash',exact:true}),'Excel / CSV'],[p.getByRole('button',{name:'Yangi Tovar',exact:true}),'Yangi mahsulot']]);
 await p.getByRole('button',{name:'Yangi Tovar',exact:true}).click();
 let d=p.locator('dialog[open]');let inputs=d.locator('input');
 await capture(p,'catalog_create',d,[[inputs.first(),'Mahsulot nomi'],[d.getByRole('button',{name:'Tanlang...',exact:true}),'Kategoriya']]);
 await p.keyboard.press('Escape');await p.getByRole('button',{name:'Fayldan yuklash',exact:true}).click();d=p.locator('dialog[open]');
 await capture(p,'catalog_import',d,[[d.getByRole('button',{name:'Shablonni yuklash'}),'Shablonni oling'],[d.locator('input[type=file]'),'Faylni tanlang'],[d.getByRole('button',{name:'Qatorlarni tekshirish'}),'Avval tekshiring']]);
 await p.keyboard.press('Escape');await p.getByRole('button',{name:'Yorliq chop etish'}).first().click();d=p.locator('dialog[open]');
 await capture(p,'catalog_labels',d,[[d.locator('select'),'Qog‘oz turi'],[d.locator('input[type=number]').first(),'O‘lcham'],[d.getByRole('button',{name:'Chop etish',exact:true}),'Chop etish']]);
 await open(p,'/inventory');await p.getByRole('button',{name:'+ Tovar Kirimi',exact:true}).click();
 await p.getByPlaceholder('Shtrix-kodni skanerlang yoki tovar nomi / artikul / model bo‘yicha qidiring...').fill('Coca');await p.waitForTimeout(500);await p.keyboard.press('Enter');await p.waitForTimeout(500);
 
 await capture(p,'inventory_intake',p.locator('dialog[open]'),[[p.getByPlaceholder('Shtrix-kodni skanerlang yoki tovar nomi / artikul / model bo‘yicha qidiring...'),'Qidirish + Enter'],[p.getByRole('button',{name:/(Kirimni|Partiyani) Tasdiqlash/i}),'Kirimni tasdiqlash']]);
 await open(p,'/inventory');await p.getByRole('button',{name:'Partiyalar va yaroqlilik',exact:true}).click();
 await capture(p,'inventory_batches',{x:310,y:115,width:1050,height:390},[[p.getByRole('button',{name:'Partiyalar va yaroqlilik',exact:true}),'Partiyalar bo‘limi']]);
 await open(p,'/pos');const search=p.getByPlaceholder('Shtrix-kod, 3 bosqichli kod yoki tovar nomini yozing (Enter bosing)...');await search.fill('Coca');await search.press('Enter');await p.waitForTimeout(500);
 await p.getByRole('button',{name:'To‘lovga O‘tish'}).scrollIntoViewIfNeeded();await p.waitForTimeout(4200);await capture(p,'pos_cart',p.getByRole('button',{name:'To‘lovga O‘tish'}).locator('..'),[[p.getByRole('button',{name:'To‘lovga O‘tish'}),'To‘lov oynasi']]);
 await p.getByRole('button',{name:'To‘lovga O‘tish'}).click();d=p.locator('dialog[open]');await capture(p,'pos_payment',d,[[d.getByRole('button',{name:/Naqd/i}).first(),'To‘lov usuli'],[d.locator('input').last(),'Qabul qilingan pul']]);
 await open(p,'/debts');await p.getByRole('button',{name:'Qarz To‘lash',exact:true}).first().click();d=p.locator('dialog[open]');await capture(p,'debt_payment',d,[[d.locator('input').first(),'To‘lov summasi'],[d.getByRole('button',{name:'To‘lovni Saqlash',exact:true}),'Haqiqiy to‘lovni saqlash']]);
 await open(p,'/shifts');await p.getByRole('button',{name:'Smenani Yopish (Z-Report)',exact:true}).click();d=p.locator('dialog[open]');await capture(p,'shift_close',d,[[d.locator('input').first(),'Sanab kiritilgan naqd'],[d.getByRole('button',{name:'Smenani Yopish & Z-Chek',exact:true}),'Yopish va hisobot']]);
 await open(p,'/employees');await capture(p,'employees_actions',{x:315,y:110,width:1050,height:415},[[p.getByRole('button',{name:'Xodim qo‘shish',exact:false}),'Yangi xodim'],[p.getByRole('button',{name:'Emailga yuborish',exact:false}).first(),'Taklif yuborish']]);
 await open(p,'/catalog');await p.getByRole('button',{name:'DEMO — Markaz',exact:true}).click();await capture(p,'tenant_switch',p.getByRole('listbox'),[[p.getByRole('button',{name:'DEMO — Markaz',exact:true}).first(),'Faol do‘kon']]);
 const guest=await contextFor(browser);const gp=await guest.newPage();await open(gp,'/login');await gp.locator('#username').click();await capture(gp,'login_fields',{x:510,y:370,width:420,height:300},[[gp.locator('#username'),'Login / telefon / email'],[gp.locator('input[type=password]').first(),'Shaxsiy parol']]);
 await open(gp,'/support');await gp.getByRole('button',{name:'Yangi murojaat',exact:true}).click();await capture(gp,'support_guest',gp.locator('.support-start'),[[gp.getByLabel('Mavzu',{exact:true}),'Murojaat mavzusi'],[gp.getByRole('button',{name:'Murojaat yuborish',exact:true}),'Operatorga yuborish']]);
 // Exercise the guest-to-operator conversation using the real APIs through the UI.
 await gp.getByLabel('Ismingiz',{exact:true}).fill('Demo mehmon');await gp.getByLabel('Mavzu',{exact:true}).fill('Platformani boshlash');await gp.getByLabel('Savolingiz',{exact:true}).fill('Yangi do‘kon ochish tartibini tushuntiring.');await gp.getByRole('checkbox').check();await gp.getByRole('button',{name:'Murojaat yuborish',exact:true}).click();await gp.locator('.support-chat-header').waitFor();
 const admin=await contextFor(browser,'demo_admin');const ap=await admin.newPage();await open(ap,'/support'+new URL(gp.url()).search);await ap.getByRole('button',{name:'Suhbatni qabul qilish',exact:true}).waitFor();await capture(ap,'support_operator',ap.locator('.support-chat-header'),[[ap.getByRole('button',{name:'Suhbatni qabul qilish',exact:true}),'Suhbatni qabul qiling']]);
 await ap.getByRole('button',{name:'Suhbatni qabul qilish',exact:true}).click();await ap.getByLabel('Savolingiz',{exact:true}).fill('Assalomu alaykum! Do‘kon ochish uchun operator sizga yordam beradi.');await ap.getByRole('button',{name:'Yuborish',exact:true}).click();await gp.getByText('Assalomu alaykum! Do‘kon ochish uchun operator sizga yordam beradi.',{exact:true}).waitFor({timeout:15000});console.log('PASS: Guest received operator reply.');
 await ap.getByLabel('Savolingiz',{exact:true}).fill('Savolingiz bo‘lsa, shu yerga yozishingiz mumkin.');await capture(ap,'support_reply',ap.locator('.support-compose'),[[ap.getByRole('button',{name:'Yuborish',exact:true}),'Javob yuborish'],[ap.getByText('Rasm qo‘shish',{exact:true}),'Skrinshot biriktirish']]);
 await ap.locator('select[aria-label=Language]').selectOption('ru');await ap.getByRole('heading',{name:'Центр поддержки',exact:true}).waitFor();await ap.locator('select[aria-label=Language]').selectOption('en');await ap.getByRole('heading',{name:'Help center',exact:true}).waitFor();console.log('PASS: Russian and English support UI.');
 await gp.setViewportSize({width:390,height:844});await gp.reload();await gp.locator('.support-chat-header').waitFor();const overflow=await gp.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Mobile overflow');console.log('PASS: Mobile layout, persisted guest chat.');
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({captured:captureDate,source:'Current React UI + isolated synthetic PostgreSQL fixtures',images:manifest},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
