import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from './browser/chrome.mjs';

// IMPORT_QA_SEED enables the same UI checks against a disposable Django API.
const seed = process.env.IMPORT_QA_SEED ? JSON.parse(await readFile(process.env.IMPORT_QA_SEED,'utf8')) : null;
const artifacts = await mkdtemp(join(tmpdir(),'ilbi-import-browser-'));
let server,browser;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),logLevel:'error',
    plugins:[{name:'import-qa-seed',configureServer(instance){instance.middlewares.use('/__import-qa/seed',(_request,response)=>{response.setHeader('Content-Type','application/json');response.end(JSON.stringify(seed));});}}],
    server:{host:'127.0.0.1',port:0,proxy:seed?{'/api':{target:process.env.IMPORT_QA_API||'http://127.0.0.1:55440',changeOrigin:true}}:{}},
  });
  await server.listen();
  browser=await launchBrowser({width:1280,height:1000});
  const wait=async expression=>{for(let i=0;i<200;i++){if(await browser.evaluate(expression))return;await delay(50);}throw Error('Timed out: '+expression);};
  const click=async text=>{await browser.evaluate(`(()=>{const node=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(text)});if(!node)throw Error('Missing button');node.click();})()`);};
  const screenshot=async name=>{const result=await browser.call('Page.captureScreenshot',{format:'png'});await writeFile(join(artifacts,name),Buffer.from(result.data,'base64'));};
  const file=async(name,body)=>{
    if(seed){
      const {root}=await browser.call('DOM.getDocument');
      const {nodeId}=await browser.call('DOM.querySelector',{nodeId:root.nodeId,selector:'dialog[open] input[type=file]'});
      await browser.call('DOM.setFileInputFiles',{nodeId,files:[seed.files[name]]});
    }else await browser.evaluate(`(()=>{const input=document.querySelector('dialog[open] input[type=file]');const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(body)}],${JSON.stringify(name)},{type:'text/csv'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await delay(75);
  };
  const valid='mijoz,telefon,nasiya_uzs,nasiya_usd\nAnvar Import,+998901112233,1250000.50,75.25\nNodira Import,+998901112244,0,0';
  await browser.call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:artifacts});
  await browser.call('Page.navigate',{url:`http://127.0.0.1:${server.httpServer.address().port}/tests/browser/counterpartyImport.html${seed?'?live=1':''}`});
  await wait(`Boolean([...document.querySelectorAll('button')].find(node=>node.textContent.trim()==='Fayldan yuklash'))`);
  await click('Fayldan yuklash');
  await wait('Boolean(document.querySelector("dialog[open] .import-dropzone"))');
  await click('Excel Shablonini Yuklab Olish');
  await wait('importQA.requests.some(row=>row.path.endsWith("/import/template/"))');
  await screenshot('upload-desktop.png');

  await file('invalid.xlsx','mijoz,telefon,nasiya_uzs\nXato summa,+998901111111,-20\nTakror,+998901111111,200');
  await click('Qatorlarni Tekshirish');
  await wait('Boolean(document.querySelector(".import-metric-chip.error"))');
  assert.equal(await browser.evaluate('[...document.querySelectorAll("dialog[open] button")].find(node=>node.textContent.includes("Xatoliklar mavjud")).disabled'),true);
  assert.equal(await browser.evaluate('importQA.requests.some(row=>row.path.endsWith("/commit/"))'),false);
  await screenshot('invalid-desktop.png');
  await click('O‘chirish');

  await file('valid.xlsx',valid);
  await click('Qatorlarni Tekshirish');
  await wait('document.querySelectorAll("dialog[open] tbody tr").length===2');
  assert.equal(await browser.evaluate('document.querySelector(".import-metric-chip.error")===null'),true);
  assert.equal(await browser.evaluate('[...document.querySelectorAll("dialog[open] button")].find(node=>node.textContent.includes("Tasdiqlash va Bazaga")).disabled'),false);
  await screenshot('preview-desktop.png');
  for(const [width,height,theme]of[[390,844,'light'],[390,844,'dark'],[320,700,'dark']]){
    await browser.resize(width,height);
    await browser.evaluate(`document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)})`);
    await delay(100);
    assert.equal(await browser.evaluate('(()=>{const d=document.querySelector("dialog[open] .dialog-content");return d.scrollWidth<=d.clientWidth+1;})()'),true,`Import dialog must fit ${width}px`);
    await screenshot(`preview-${width}-${theme}.png`);
  }
  await browser.resize(1280,1000);
  await browser.evaluate('document.documentElement.setAttribute("data-theme","light")');
  await click('Tasdiqlash va Bazaga Saqlash (2 ta mijoz)');
  await wait('!document.querySelector("dialog[open]")&&document.body.textContent.includes("Anvar Import")');
  assert.equal(await browser.evaluate('document.body.textContent.includes("Nodira Import")'),true);
  await screenshot('imported-list.png');

  // Importing the same file again must show errors before a second commit.
  await click('Fayldan yuklash');await wait('Boolean(document.querySelector("dialog[open]"))');
  await file('valid.xlsx',valid);await click('Qatorlarni Tekshirish');
  await wait('Boolean(document.querySelector(".import-metric-chip.error"))');
  await browser.evaluate('document.querySelector("dialog[open] button[aria-label=Yopish]").click()');
  await wait('!document.querySelector("dialog[open]")');

  // Review pagination and clearing a selected file must invalidate its preview.
  await click('Fayldan yuklash');await wait('Boolean(document.querySelector("dialog[open]"))');
  await file('many.csv','mijoz,telefon\n'+Array.from({length:51},(_,i)=>`Pagination ${i},+99890222${String(i).padStart(4,'0')}`).join('\n'));
  await click('Qatorlarni Tekshirish');await wait('document.querySelectorAll("dialog[open] tbody tr").length===50');
  await browser.evaluate(`document.querySelector('dialog[open] button[title="Keyingi sahifa"]').click()`);
  await wait('document.querySelectorAll("dialog[open] tbody tr").length===1');
  await click('O‘chirish');await wait('!document.querySelector("dialog[open] tbody")');
  await browser.evaluate('document.querySelector("dialog[open] button[aria-label=Yopish]").click()');
  await wait('!document.querySelector("dialog[open]")');

  // Catalog keeps the same upload, review and save behavior after sharing the UI.
  await browser.evaluate('document.querySelector("#catalog-regression").click()');
  await wait('Boolean(document.querySelector("dialog[open]"))');
  await file('catalog.csv','mahsulot,kategoriya,sotuv_narxi\nImport sinov tovari,Sinov,15000');
  await click('Qatorlarni Tekshirish');await wait('document.querySelectorAll("dialog[open] tbody tr").length===1');
  assert.equal(await browser.evaluate('document.querySelector(".import-metric-chip.error")===null'),true);
  await click('Tasdiqlash va Bazaga Saqlash (1 ta mahsulot)');await wait('importQA.catalogSaved&&!document.querySelector("dialog[open]")');
  assert.deepEqual(browser.errors,[]);
  console.log(`PASS ${seed?'live Django/PostgreSQL XLSX':'isolated UI'}: template, invalid rows, preview, light/dark mobile layouts, save, refreshed list, duplicate rejection, pagination and catalog regression. Screenshots: ${artifacts}`);
} finally {
  if(browser)await browser.close();
  if(server)await server.close();
}
