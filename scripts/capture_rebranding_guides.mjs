// Only run against an isolated preview whose session file declares synthetic data.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { launchBrowser } from '../branding/ilbi-motion-studio/scripts/browser.mjs';

const base = process.env.ILBI_DOCS_BASE_URL || 'http://127.0.0.1:5177';
const authFile = process.env.ILBI_DOCS_AUTH_FILE;
if (!authFile) throw new Error('ILBI_DOCS_AUTH_FILE must point to isolated synthetic sessions.');
const auth = JSON.parse(await readFile(authFile, 'utf8'));
assert.equal(auth._meta?.synthetic, true, 'Real accounts must never be used for documentation.');
assert.equal(auth._meta.origin, base);
const out = new URL('../docs/rasmlar/focused/', import.meta.url);
const qa = new URL('../branding/ilbi-motion-studio/qa/rebranding/', import.meta.url);
await mkdir(out, { recursive: true });
await mkdir(qa, { recursive: true });
const date = process.env.ILBI_DOCS_CAPTURE_DATE || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const manifest = [];
const checks = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const button = (text, exact = true) => {
  const value = JSON.stringify(text.toLocaleLowerCase());
  const predicate = exact ? `name === ${value}` : `name.includes(${value})`;
  return `[...document.querySelectorAll('button')].find(b => { const name=(b.textContent.trim() || b.getAttribute('aria-label') || b.title).toLocaleLowerCase(); return b.getClientRects().length && ${predicate}; })`;
};

async function wait(browser, expression, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (await browser.evaluate(expression)) return; } catch { /* Wait for navigation. */ }
    await delay(60);
  }
  throw new Error('Preview condition timed out: ' + expression);
}
async function open(browser, path) {
  await browser.call('Page.navigate', { url: base + path });
  await wait(browser, `document.readyState === 'complete' && document.querySelector('#root')?.children.length && !document.querySelector('.ilbi-loading')`);
  await delay(450);
  if (await browser.evaluate(`Boolean(document.querySelector('.ilbi-intro[open]'))`)) {
    await browser.evaluate(`document.querySelector('.ilbi-intro__skip').click()`);
  }
  await wait(browser, `!document.querySelector('.ilbi-intro[open]')`);
  assert.equal(await browser.evaluate(`/inventra/i.test(document.body.innerText)`), false, 'Old visible product name at ' + path);
  assert.ok((await browser.evaluate('document.title')).startsWith('ILBI'));
}
async function click(browser, text, exact = true) {
  const expression = button(text, exact);
  await wait(browser, `Boolean(${expression})`);
  await browser.evaluate(`(${expression}).click()`);
  await delay(200);
}
async function createBrowser(role) {
  const browser = await launchBrowser({ width: 1440, height: 1100, reducedMotion: true });
  await browser.call('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  const session = auth[role];
  await browser.call('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('ilbi_theme','light');${session ? `{
      const d=${JSON.stringify(session)};
      localStorage.setItem('ilbi_access_token',d.tokens.access);
      localStorage.setItem('ilbi_refresh_token',d.tokens.refresh);
      localStorage.setItem('ilbi_user',JSON.stringify(d.user));
      if(d.user.tenants[0])localStorage.setItem('ilbi_active_tenant:'+d.user.id,String(d.user.tenants[0].id));
    }` : ''}`,
  });
  return browser;
}
async function capture(browser, filename, targets = []) {
  await browser.evaluate(`(() => {
    const targets = [${targets.map(([expression, label]) => `{element:(${expression}),label:${JSON.stringify(label)}}`).join(',')}];
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.id='docs-annotations';
    svg.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;overflow:visible';
    const el=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))e.setAttribute(key,value);if(text)e.textContent=text;svg.appendChild(e);};
    for(const [i,target]of targets.entries()){
      if(!target.element || !target.element.getClientRects().length)throw Error('Missing annotation target: '+target.label);
      const b=target.element.getBoundingClientRect();
      const x=Math.max(8,Math.min(innerWidth-280,b.x));const y=Math.max(8,b.y-43);
      el('rect',{x:b.x-3,y:b.y-3,width:b.width+6,height:b.height+6,rx:7,fill:'none',stroke:'#e85524','stroke-width':2.5});
      el('path',{d:'M '+(x+25)+' '+(y+29)+' L '+(b.x+Math.min(b.width/2,40))+' '+b.y,stroke:'#e85524','stroke-width':2.5,fill:'none'});
      el('rect',{x,y,width:Math.min(270,target.label.length*7+42),height:28,rx:7,fill:'#ffdf65',stroke:'#d8a826'});
      el('text',{x:x+10,y:y+19,fill:'#201a0f','font-family':'Arial,sans-serif','font-size':13,'font-weight':700},(i+1)+'. '+target.label);
    }
    (document.querySelector('dialog[open]')||document.body).appendChild(svg);
  })()`);
  await writeFile(new URL(filename, out), await browser.screenshot());
  const route = await browser.evaluate('location.pathname');
  await browser.evaluate(`document.querySelector('#docs-annotations')?.remove()`);
  manifest.push({ file: filename, route, annotations: targets.map(t => t[1]), captured: date, data: 'synthetic' });
  console.log('Captured', filename);
}

let owner, guest, admin;
try {
  owner = await createBrowser('demo_owner');
  await open(owner, '/catalog');
  await capture(owner, 'catalog_tools.png', [[button('Fayldan yuklash'), 'Excel / CSV'], [button('Yangi Tovar'), 'Yangi mahsulot']]);
  await click(owner, 'Yangi Tovar');
  await capture(owner, 'catalog_create.png', [[`document.querySelector('dialog[open] input')`, 'Mahsulot nomi'], [button('Tanlang...'), 'Kategoriya']]);
  await open(owner, '/catalog'); await click(owner, 'Fayldan yuklash');
  await capture(owner, 'catalog_import.png', [[button('Excel Shablonini Yuklab Olish'), 'Shablonni oling'], [`document.querySelector('dialog[open] input[type=file]').nextElementSibling`, 'Faylni tanlang'], [button('Qatorlarni Tekshirish'), 'Avval tekshiring']]);
  await open(owner, '/catalog'); await click(owner, 'Yorliq');
  await capture(owner, 'catalog_labels.png', [[button('A4 (Varroqli)'), 'Qog‘oz turi'], [`document.querySelector('dialog[open] input[type=number]')`, 'O‘lcham'], [button('Chop etish'), 'Chop etish']]);
  await open(owner, '/inventory'); await click(owner, '+ Tovar Kirimi');
  await capture(owner, 'inventory_intake.png', [[`document.querySelector('dialog[open] input[placeholder*="Shtrix-kodni"]')`, 'Qidirish + Enter'], [button('Kirimni Tasdiqlash', false), 'Kirimni tasdiqlash']]);
  await open(owner, '/inventory'); await click(owner, 'Partiyalar va yaroqlilik');
  await capture(owner, 'inventory_batches.png', [[button('Partiyalar va yaroqlilik'), 'Partiyalar bo‘limi']]);
  await open(owner, '/pos');
  await wait(owner, `Boolean(document.querySelector('.glass-card.interactive'))`);
  await owner.evaluate(`document.querySelector('.glass-card.interactive').click()`);
  await delay(200);
  await capture(owner, 'pos_cart.png', [[button('To‘lovga O‘tish'), 'To‘lov oynasi']]);
  await click(owner, 'To‘lovga O‘tish');
  await capture(owner, 'pos_payment.png', [[button('Naqd Pul'), 'To‘lov usuli'], [`[...document.querySelectorAll('dialog[open] input')].at(-1)`, 'Qabul qilingan pul']]);
  await open(owner, '/debts'); await click(owner, 'Qarz To‘lash');
  await capture(owner, 'debt_payment.png', [[`document.querySelector('dialog[open] input')`, 'To‘lov summasi'], [button('To‘lovni Saqlash'), 'Haqiqiy to‘lovni saqlash']]);
  await open(owner, '/shifts'); await click(owner, 'Smenani Yopish (Z-Report)');
  await capture(owner, 'shift_close.png', [[`document.querySelector('dialog[open] input')`, 'Sanab kiritilgan naqd'], [button('Smenani Yopish & Z-Chek'), 'Yopish va hisobot']]);
  await open(owner, '/employees');
  await capture(owner, 'employees_actions.png', [[button('Xodim qo‘shish'), 'Yangi xodim'], [button('Emailga yuborish'), 'Taklif yuborish']]);
  await open(owner, '/catalog'); await click(owner, auth.demo_owner.user.tenants[0].name);
  await capture(owner, 'tenant_switch.png', [[`document.querySelector('[role=listbox]')`, 'Faol do‘kon']]);

  guest = await createBrowser();
  await open(guest, '/login');
  await capture(guest, 'login_fields.png', [[`document.querySelector('#username')`, 'Login / telefon / email'], [`document.querySelector('input[type=password]')`, 'Shaxsiy parol']]);
  await writeFile(new URL('login-light.png', qa), await guest.screenshot());
  await guest.resize(390, 844);
  assert.equal(await guest.evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await writeFile(new URL('login-mobile.png', qa), await guest.screenshot());
  await guest.resize(1440, 1100);
  // Render the actual loading component in an isolated overlay to verify both themes.
  await guest.evaluate(`(async()=>{
    const ReactModule=await import('/node_modules/.vite/deps/react.js');const React=ReactModule.default||ReactModule;
    const DOMModule=await import('/node_modules/.vite/deps/react-dom_client.js');const DOM=DOMModule.default||DOMModule;
    const {default:Loading}=await import('/src/components/common/AppLoadingScreen.jsx');
    const host=document.createElement('div');host.id='loading-qa';document.body.appendChild(host);
    window.loadingQaRoot=DOM.createRoot(host);window.loadingQaRoot.render(React.createElement(Loading,{message:'Sahifa yuklanmoqda...'}));
  })()`);
  await wait(guest, `Boolean(document.querySelector('.ilbi-loading'))`);
  assert.equal(await guest.evaluate(`/PRO|inventra/i.test(document.querySelector('.ilbi-loading').innerText)`), false);
  assert.equal(await guest.evaluate(`getComputedStyle(document.querySelector('.ilbi-loading__ring')).animationName`), 'none');
  await writeFile(new URL('loading-light.png', qa), await guest.screenshot());
  await guest.evaluate(`document.documentElement.dataset.theme='dark'`);
  await delay(300);
  await writeFile(new URL('loading-dark.png', qa), await guest.screenshot());
  await guest.evaluate(`window.loadingQaRoot.unmount();document.querySelector('#loading-qa').remove();document.documentElement.dataset.theme='light'`);
  checks.push('Light/dark loading, reduced-motion, mobile login, badge-free ILBI logo');
  await open(guest, '/support'); await click(guest, 'Yangi murojaat');
  await capture(guest, 'support_guest.png', [[`[...document.querySelectorAll('.support-start label')].find(l=>l.textContent.includes('Mavzu'))?.querySelector('input')`, 'Murojaat mavzusi'], [button('Murojaat yuborish'), 'Operatorga yuborish']]);
  const conversation = await guest.evaluate(`(async()=>{
    const response=await fetch('/api/v1/support/guest/',{method:'POST',headers:{'Content-Type':'application/json','X-Support-Token':localStorage.getItem('ilbi_support_guest')},body:JSON.stringify({name:'Demo mehmon',subject:'Platformani boshlash',text:'Yangi do‘kon ochish tartibini tushuntiring.',language:'uz',consent:true,client_id:crypto.randomUUID()})});
    if(!response.ok)throw Error('Synthetic conversation failed: '+response.status);
    return (await response.json()).id;
  })()`);
  admin = await createBrowser('demo_admin');
  await open(admin, '/support?conversation=' + conversation);
  await wait(admin, `Boolean(${button('Suhbatni qabul qilish')})`);
  await capture(admin, 'support_operator.png', [[button('Suhbatni qabul qilish'), 'Suhbatni qabul qiling']]);
  await click(admin, 'Suhbatni qabul qilish');
  await capture(admin, 'support_reply.png', [[button('Yuborish'), 'Javob yuborish'], [`document.querySelector('.support-compose label')`, 'Skrinshot biriktirish']]);
  checks.push('Synthetic guest conversation and operator acceptance');
  for (const browser of [owner, guest, admin]) {
    const errors = browser.errors.filter(e => !e.includes('ERR_BLOCKED_BY_CLIENT'));
    assert.deepEqual(errors, [], 'Unexpected browser errors');
  }
  assert.equal(new Set(manifest.map(i => i.file)).size, 16);
  await writeFile(new URL('manifest.json', out), JSON.stringify({captured:date,source:'ILBI React UI + isolated synthetic PostgreSQL fixtures',images:manifest},null,2)+'\n');
  await writeFile(new URL('verification.json', qa), JSON.stringify({captured:date,checks,focusedImages:manifest.length,browserErrors:[]},null,2)+'\n');
  console.log('Verified and captured', manifest.length, 'focused guides.');
} finally {
  for (const browser of [owner, guest, admin].filter(Boolean)) await browser.close();
}
