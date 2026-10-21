import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from './browser/chrome.mjs';

const seed = JSON.parse(await readFile(process.env.ILBI_WORKSPACE_SEED || '/tmp/ilbi-workspace-seed.json', 'utf8'));
assert.equal(seed._meta.synthetic, true);
assert.equal(seed._meta.database, 'ilbi_workspace_qa');
const artifacts = await mkdtemp(join(tmpdir(), 'ilbi-workspace-browser-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let server, browser;
try {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), cacheDir: 'node_modules/.vite-workspace-qa', logLevel: 'error',
    plugins: [{ name: 'workspace-qa', configureServer(instance) {
      instance.middlewares.use('/__workspace-qa/seed', (_request, response) => {
        response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(seed));
      });
      instance.middlewares.use((request, _response, next) => {
        if (request.headers.accept?.includes('text/html') && !request.url.startsWith('/api/') && !request.url.startsWith('/tests/')) {
          const params = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
          request.url = '/tests/browser/workspace.html' + params;
        }
        next();
      });
    } }],
    server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: process.env.ILBI_WORKSPACE_API || 'http://127.0.0.1:55441', changeOrigin: true } } },
  });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await launchBrowser({ width: 1536, height: 1100 });
  const wait = async expression => {
    for (let i = 0; i < 240; i++) { if (await browser.evaluate(expression)) return; await delay(50); }
    throw Error('Timed out: ' + expression);
  };
  const settled = () => wait('Boolean(window.workspaceQA)&&workspaceQA.pending===0');
  const click = async text => {
    await browser.evaluate(`(()=>{const node=[...document.querySelectorAll('button,summary,a')].find(node=>node.getClientRects().length&&(node.textContent.trim()===${JSON.stringify(text)}||node.querySelector('strong')?.textContent.trim()===${JSON.stringify(text)}));if(!node)throw Error('Missing control: '+${JSON.stringify(text)});node.click();})()`);
    await delay(80);
  };
  const setInput = async (selector, value) => {
    await browser.evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw Error('Missing input: '+${JSON.stringify(selector)});input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await delay(60);
  };
  const close = async () => {
    await browser.evaluate('[...document.querySelectorAll("dialog[open]")].at(-1).querySelector("button[aria-label=Yopish]").click()');
    await delay(80);
  };
  const shot = async name => writeFile(join(artifacts, name + '.png'), Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const toggle = async fast => {
    const started = await browser.evaluate('performance.now()');
    await browser.evaluate('document.querySelector("button[aria-label=\\\"Ish stolini almashtirish\\\"]").click()');
    await wait(fast ? 'Boolean(document.querySelector(".workspace-navbar .workspace-top-row"))' : 'Boolean(document.querySelector(".sidebar"))');
    const elapsed = await browser.evaluate('performance.now()') - started;
    assert.ok(elapsed < 2000, `Shell switch took ${elapsed}ms before animation`);
    await delay(500);
  };
  const quick = async label => { await click('Yangi'); await click(label); await wait('Boolean(document.querySelector("dialog[open]"))'); };
  const search = async query => {
    await browser.evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"k",ctrlKey:true,bubbles:true,cancelable:true}))');
    await wait('Boolean(document.querySelector("dialog[open] input[role=combobox]"))');
    await setInput('dialog[open] input[role=combobox]', query);
    await wait('!document.querySelector("dialog[open]").textContent.includes("Qidirilmoqda")');
    await delay(350);
  };

  await browser.call('Page.navigate', { url: origin + '/debts?role=owner' });
  await wait('Boolean(document.querySelector(".sidebar"))&&Boolean(document.querySelector("input[placeholder=\\\"Mijoz nomi yoki telefoni...\\\"]"))');
  await settled();
  const classicLinks = await browser.evaluate('[...document.querySelectorAll(".sidebar nav a")].map(node=>node.getAttribute("href"))');
  await setInput('input[placeholder="Mijoz nomi yoki telefoni..."]', 'Anvar'); await delay(400); await settled();
  await browser.evaluate('window.keptInput=document.querySelector("input[placeholder=\\\"Mijoz nomi yoki telefoni...\\\"]");window.beforeSwitchRequests=workspaceQA.requests.length');
  await shot('classic');
  await toggle(true); await settled();
  assert.equal(await browser.evaluate('keptInput===document.querySelector("input[placeholder=\\\"Mijoz nomi yoki telefoni...\\\"]")&&keptInput.value==="Anvar"'), true, 'Layout switch must preserve the actual mounted page and its input');
  const fastLinks = await browser.evaluate('[...document.querySelectorAll(".workspace-nav-row a")].map(node=>node.getAttribute("href"))');
  assert.deepEqual([...new Set(fastLinks)].sort(), [...new Set(classicLinks)].sort(), 'Every classic navigation destination must exist in the new navbar');
  const duplicated = await browser.evaluate('workspaceQA.requests.slice(beforeSwitchRequests).filter(row=>row.path.includes("/counterparties/")||row.path.includes("/shift/current/")||row.path.includes("/notifications/")).length');
  assert.equal(duplicated, 0, 'Switching layouts must not restart the page, shift or notification requests');
  await shot('fast-debts');
  for (let i = 0; i < 4; i++) { await toggle(false); await toggle(true); }
  assert.equal(await browser.evaluate('workspaceQA.requests.filter(row=>row.path==="/api/v1/workspace/reminders/").length'), 1, 'Fresh reminder data is reused while switching layouts');
  assert.equal(await browser.evaluate('keptInput===document.querySelector("input[placeholder=\\\"Mijoz nomi yoki telefoni...\\\"]")'), true);
  await click('Bosh sahifa'); await wait('Boolean(document.querySelector(".work-desktop"))'); await settled();
  await shot('fast-dashboard-light');
  await browser.evaluate('document.querySelector("button[aria-label=\\\"Mavzuni almashtirish\\\"]").click()'); await delay(100); await shot('fast-dashboard-dark');
  for (const width of [1280, 1024]) {
    await browser.resize(width, 1000); await delay(150);
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), true, `No horizontal overflow at ${width}px`);
    assert.equal(await browser.evaluate('(()=>{const box=document.querySelector(".workspace-utility-actions").getBoundingClientRect();return box.right<=innerWidth&&box.left>=0;})()'), true, `Navbar utilities fit ${width}px`);
    await shot('fast-' + width);
  }
  await browser.resize(1536, 1100);

  await search('Anvar');
  await wait('[...document.querySelectorAll("#workspace-search-results button")].some(node=>node.textContent.includes("Anvar Abdullayev"))');
  const customerIndex = await browser.evaluate('[...document.querySelectorAll("#workspace-search-results button")].findIndex(node=>node.textContent.includes("Anvar Abdullayev"))');
  for (let i = 0; i < customerIndex; i++) {
    await browser.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
    await browser.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
  }
  await browser.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await browser.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait('location.pathname==="/debts"&&Boolean(document.querySelector("dialog[open]"))'); await settled(); await close();
  await search('Anvar un');
  await wait('[...document.querySelectorAll("#workspace-search-results button")].some(node=>node.textContent.includes("Anvar un"))');
  await browser.evaluate('document.querySelector("#workspace-search-results button").click()');
  await wait('location.pathname==="/catalog"&&!document.querySelector("dialog[open]")'); await settled();
  await search('QA-'); await wait('[...document.querySelectorAll("#workspace-search-results button")].some(node=>node.textContent.includes("Cheklar"))');
  await browser.evaluate('[...document.querySelectorAll("#workspace-search-results button")].find(node=>node.textContent.includes("Cheklar")).click()');
  await wait('location.pathname==="/sales"&&Boolean(document.querySelector("dialog[open]"))'); await settled(); await close();

  await quick('Yangi mijoz');
  const nameSelector = 'dialog[open] input[type=text]';
  await setInput(nameSelector, 'Almashishda saqlanadigan qoralama');
  await browser.evaluate('void(window.keptForm=document.querySelector("dialog[open] input[type=text]"))');
  await toggle(false);
  assert.equal(await browser.evaluate('keptForm===document.querySelector("dialog[open] input[type=text]")&&keptForm.value.includes("qoralama")'), true, 'Open form and dialog must survive layout changes');
  await toggle(true); await close();
  await quick('Tovar kirimi'); await settled(); await close();
  await quick('XLSX import'); await click('Mijozlar va nasiya importi'); await wait('Boolean(document.querySelector("dialog[open] .import-dropzone"))'); await close();
  await quick('XLSX import'); await click('Tovarlar importi'); await wait('Boolean(document.querySelector("dialog[open] .import-dropzone"))'); await close();
  await quick('Qarz to‘lovi'); await settled();
  await wait('[...document.querySelectorAll("dialog[open] .workspace-search-results button")].some(node=>node.textContent.includes("Anvar"))');
  await browser.evaluate('[...document.querySelectorAll("dialog[open] .workspace-search-results button")].find(node=>node.textContent.includes("Anvar")).click()');
  await wait('Boolean(document.querySelector("dialog[open]"))&&document.querySelector("dialog[open]").textContent.includes("Qarz To‘lovini")');
  await settled(); await close();

  await browser.evaluate('document.querySelector("summary[aria-label=\\\"Tezkor yordamchilar\\\"]").click()'); await click('Kalkulyator');
  await setInput('input[aria-label="Hisoblash ifodasi"]', '125000 × 3 + 5000'); await click('Hisoblash');
  assert.equal(await browser.evaluate('document.querySelector("output").textContent.replace(/\\D/g,"")'), '380000'); await close();
  await click('Moslashtirish');
  await browser.evaluate('[...document.querySelectorAll(".workspace-favorite-choice")].find(node=>node.textContent.includes("B2B")).querySelector("input").click()');
  await close(); assert.equal(await browser.evaluate('document.querySelector(".workspace-favorites-row").textContent.includes("B2B")'), true);

  await browser.evaluate(`document.querySelector('summary[aria-label="Tezkor yordamchilar"]').click()`); await click('Klaviatura yordamchisi'); await close();
  if (await browser.evaluate('document.fullscreenEnabled')) {
    await browser.evaluate(`document.querySelector('summary[aria-label="Tezkor yordamchilar"]').click()`); await click('To‘liq ekran');
    await wait('Boolean(document.fullscreenElement)');
    await browser.evaluate(`document.querySelector('summary[aria-label="Tezkor yordamchilar"]').click()`);
    await wait('[...document.querySelectorAll("button")].some(node=>node.textContent.trim()==="To‘liq ekrandan chiqish")');
    await click('To‘liq ekrandan chiqish');
    await wait('!document.fullscreenElement');
  }
  await browser.evaluate(`document.querySelector('summary[aria-label="Profil va chiqish"]').click()`); await click('Chiqish');
  await wait('Boolean(document.querySelector("dialog[open]"))'); await click('Bekor qilish');
  assert.equal(await browser.evaluate('Boolean(workspaceQA.loggedOut)'), false, 'Cancelling logout keeps the account active');
  await browser.evaluate(`document.querySelector('.workspace-shift-control [role="button"]').click()`);
  await wait('Boolean(document.querySelector("dialog[open]"))'); await settled(); await close();

  await quick('Eslatma'); await settled();
  await setInput('dialog[open] input[placeholder^="Masalan:"]', 'QA yangi eslatma');
  await setInput('dialog[open] input[type=datetime-local]', '2026-10-20T09:00');
  await click('Eslatmani saqlash'); await settled();
  await wait('document.querySelector("dialog[open]").textContent.includes("QA yangi eslatma")');
  await browser.evaluate('document.querySelector("input[aria-label=\\\"QA yangi eslatma — bajarildi\\\"]").click()'); await settled();
  await click('Bajarilganlarni ko‘rish'); await settled();
  await wait('document.querySelector("dialog[open]").textContent.includes("QA yangi eslatma")');
  await browser.evaluate('document.querySelector("button[aria-label=\\\"QA yangi eslatma — o‘chirish\\\"]").click()');
  await wait('document.querySelectorAll("dialog[open]").length===2'); await click('O‘chirish'); await settled();
  await wait('document.querySelectorAll("dialog[open]").length===1'); await close();

  // POS cart remains mounted and retains quantity while changing shells.
  await click('Kassa'); await settled();
  await wait('Boolean(document.querySelector("input[placeholder^=\\\"Shtrix-kod,\\\"]"))');
  await setInput('input[placeholder^="Shtrix-kod,"]', 'Anvar'); await delay(400); await settled();
  await wait('[...document.querySelectorAll(".glass-card.interactive")].some(node=>node.textContent.includes("Anvar un"))');
  await browser.evaluate('[...document.querySelectorAll(".glass-card.interactive")].find(node=>node.textContent.includes("Anvar un")).click()');
  await wait('Boolean(document.querySelector("input[title=\\\"Soni (qo‘lda kiritish mumkin)\\\"]"))');
  await setInput('input[title="Soni (qo‘lda kiritish mumkin)"]', '3');
  await browser.evaluate('void(window.keptPos=document.querySelector("input[placeholder^=\\\"Shtrix-kod,\\\"]"))');
  await toggle(false); await toggle(true);
  assert.equal(await browser.evaluate('keptPos===document.querySelector("input[placeholder^=\\\"Shtrix-kod,\\\"]")&&keptPos.value==="Anvar"'), true);
  assert.equal(await browser.evaluate('document.querySelector("input[title=\\\"Soni (qo‘lda kiritish mumkin)\\\"]").value'), '3', 'POS cart quantity survives switching');
  await browser.evaluate('window.workspaceBeforeReload=true');
  await browser.call('Page.reload');
  await wait('Boolean(window.workspaceQA)&&!window.workspaceBeforeReload&&Boolean(document.querySelector(".workspace-navbar .workspace-top-row"))'); await settled();
  assert.equal(await browser.evaluate('document.querySelector("input[title=\\\"Soni (qo‘lda kiritish mumkin)\\\"]").value'), '3', 'POS cart quantity survives reload');
  assert.equal(await browser.evaluate('document.querySelector(".workspace-favorites-row").textContent.includes("B2B")'), true);

  // Optional debt date survives both shells and reload, then reaches the real ledger.
  await click('To‘lovga O‘tish'); await settled(); await click('Nasiya / Qarz');
  await browser.evaluate('document.querySelector("dialog[open] .custom-select-wrapper [role=button]").click()');
  await wait('[...document.querySelectorAll("[role=option]")].some(node=>node.textContent.includes("Anvar Abdullayev"))');
  await browser.evaluate('[...document.querySelectorAll("[role=option]")].find(node=>node.textContent.includes("Anvar Abdullayev")).click()');
  await wait('Boolean(document.querySelector("input[name=debt_due_date]"))');
  assert.equal(await browser.evaluate('document.querySelector("input[name=debt_due_date]").required'), false);
  await setInput('input[name=debt_due_date]', '2035-03-15');
  await toggle(false); await toggle(true);
  assert.equal(await browser.evaluate('document.querySelector("input[name=debt_due_date]").value'), '2035-03-15');
  await browser.resize(390, 844); await delay(150);
  assert.equal(await browser.evaluate('(()=>{const box=document.querySelector("input[name=debt_due_date]").getBoundingClientRect();return box.left>=0&&box.right<=innerWidth})()'), true);
  await shot('debt-date-mobile'); await browser.resize(1536, 1100); await close();
  await browser.call('Page.reload'); await wait('Boolean(window.workspaceQA)&&Boolean(document.querySelector(".workspace-navbar"))'); await settled();
  await click('To‘lovga O‘tish'); await settled();
  assert.equal(await browser.evaluate('document.querySelector("input[name=debt_due_date]").value'), '2035-03-15');
  await click('Sotuvni Tasdiqlash'); await settled();
  await wait('document.querySelector("dialog[open]")?.textContent.includes("Sotuv Muvaffaqiyatli")'); await close();
  await browser.evaluate('(async()=>{window.debtQAApi=(await import("/src/api/client.js")).salesApi;return true})()');
  assert.equal(await browser.evaluate(`debtQAApi.getCounterparty(${seed.customer_id}).then(cp=>cp.debt_due_date)`), '2035-03-15');

  // Reschedule in the customer form, then follow the owner's one-time reminder.
  await search('Anvar'); await settled();
  await browser.evaluate('[...document.querySelectorAll("#workspace-search-results button")].find(node=>node.textContent.includes("Anvar Abdullayev")).click()');
  await wait('location.pathname==="/debts"&&Boolean(document.querySelector("dialog[open]"))'); await settled(); await close();
  await browser.evaluate('[...document.querySelectorAll("tr")].find(row=>row.textContent.includes("Anvar Abdullayev")).querySelector("button").click()');
  await wait('Boolean(document.querySelector("input[name=debt_due_date]"))');
  assert.equal(await browser.evaluate('document.querySelector("input[name=debt_due_date]").value'), '2035-03-15');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
  await setInput('input[name=debt_due_date]', today); await click('Saqlash'); await settled();
  await wait('document.querySelector(".workspace-notifications-menu").textContent.includes("Qarzni qaytarish sanasi keldi")');
  const due = await browser.evaluate('debtQAApi.getNotifications().then(rows=>rows.filter(row=>row.type==="debt_due_reminder"))');
  assert.equal(due.length, 1); assert.equal(due[0].link, `/debts?workspace_id=${seed.customer_id}`);
  await browser.evaluate('document.querySelector("summary[aria-label=Xabarnomalar]").click()');
  await click('Qarzni qaytarish sanasi keldi');
  await wait('Boolean(document.querySelector(".notif-card"))'); await shot('owner-debt-reminder');
  await browser.evaluate(`document.querySelector('.notif-card button[title="Sahifaga o‘tish"]').click()`);
  await wait('[...document.querySelectorAll("dialog[open]")].some(node=>node.textContent.includes("Mijoz Nasiya & Xarid Tarixi"))');
  await settled();
  assert.equal(await browser.evaluate('document.querySelectorAll("dialog[open]").length'), 1, 'Following a reminder closes the notification dialog');
  await close();
  assert.equal(await browser.evaluate('debtQAApi.getNotifications().then(rows=>rows.filter(row=>row.type==="debt_due_reminder").length)'), 1);
  await browser.evaluate('[...document.querySelectorAll("tr")].find(row=>row.textContent.includes("Anvar Abdullayev")).querySelector("button").click()');
  await wait('Boolean(document.querySelector("input[name=debt_due_date]"))');
  await setInput('input[name=debt_due_date]', ''); await click('Saqlash'); await settled();
  assert.equal(await browser.evaluate(`debtQAApi.getCounterparty(${seed.customer_id}).then(cp=>cp.debt_due_date)`), null);

  await browser.evaluate(`workspaceQA.selectTenant(${seed.second_tenant})`); await settled();
  await wait('document.querySelector(".workspace-store-control").textContent.includes("Yunusobod")');
  assert.equal(await browser.evaluate('document.body.textContent.includes("Anvar un")'), false, 'Switching tenant clears tenant page data');
  await browser.resize(390, 844); await delay(200); assert.equal(await browser.evaluate('Boolean(document.querySelector(".sidebar"))&&!document.querySelector(".workspace-navbar")'), true);
  await browser.resize(1536, 1100); await wait('Boolean(document.querySelector(".workspace-navbar"))');
  // Reduced-motion users and older browsers keep an immediate, working switch.
  await browser.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await browser.evaluate('document.startViewTransition=undefined');
  await toggle(false); await toggle(true);

  // Each account has its own preference, and limited staff never requests owners' data.
  await browser.call('Page.navigate', { url: origin + '/debts?role=staff' });
  await wait('Boolean(document.querySelector(".sidebar"))'); await settled();
  await toggle(true); await click('Yangi');
  assert.equal(await browser.evaluate('document.querySelector(".workspace-actions-menu").textContent.includes("Tovar kirimi")'), false);
  assert.equal(await browser.evaluate('document.querySelector(".workspace-actions-menu").textContent.includes("Qarz to‘lovi")'), false);
  await browser.evaluate('document.querySelector("details[open]").open=false');
  await search('Anvar'); await settled();
  assert.equal(await browser.evaluate('document.querySelector("#workspace-search-results").textContent.includes("Anvar Abdullayev")'), true);
  assert.equal(await browser.evaluate('document.querySelector("#workspace-search-results").textContent.includes("Tovarlar ·")'), false); await close();
  await browser.call('Page.navigate', { url: origin + '/profile?role=admin' });
  await wait('Boolean(document.querySelector(".sidebar"))'); await settled(); await toggle(true);
  await search('Hisoblar'); await settled();
  assert.equal(await browser.evaluate('workspaceQA.requests.some(row=>row.path.startsWith("/api/v1/workspace/"))'), false, 'Platform admin never queries tenant workspace records'); await close();
  assert.deepEqual(browser.errors, []);
  console.log(`PASS live workspace: navigation parity, repeated animated switches without page/shift remounts, preserved inputs/forms, search for products/customers/receipts, quick actions/imports, reminders CRUD, optional debt date in checkout/customer edit, owner reminder and customer link, calculator, favorites/reload, tenant/account/role isolation, 1024–1536px and mobile fallback. Screenshots: ${artifacts}`);
} catch (error) {
  if (browser) {
    await writeFile(join(artifacts, 'failure.png'), Buffer.from((await browser.call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    console.error(await browser.evaluate('({url:location.href,errors:window.workspaceQA?.requests?.slice(-8),dialogs:[...document.querySelectorAll("dialog[open]")].map(node=>node.textContent.slice(0,500))})'));
    console.error('Browser errors:', browser.errors, 'Artifacts:', artifacts);
  }
  throw error;
} finally { if (browser) await browser.close(); if (server) await server.close(); }
