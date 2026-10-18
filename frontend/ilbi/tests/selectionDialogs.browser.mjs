import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from './browser/chrome.mjs';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let server,browser;
try{
 server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),cacheDir:'node_modules/.vite-selection-qa',optimizeDeps:{include:['react','react-dom/client','react-router-dom','lucide-react','qrcode']},logLevel:'error',server:{host:'127.0.0.1',port:0}});
 await server.listen();
 browser=await launchBrowser({width:1280,height:900});
 const base=`http://127.0.0.1:${server.httpServer.address().port}/tests/browser/selectionDialogs.html`;
 const wait=async expression=>{for(let i=0;i<200;i++){if(await browser.evaluate(expression))return;await delay(35);}throw Error(`Timeout: ${expression}\n${browser.errors.join('\n')}`);};
 const navigate=async query=>{await browser.call('Page.navigate',{url:base+query});await wait('Boolean(window.selectionQA)&&Boolean(document.querySelector("main"))');};
 const click=async text=>browser.evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(text)});if(!button)throw Error('Missing button: '+${JSON.stringify(text)});button.click();})()`);
 const escape=async()=>{await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await browser.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});};
 const menuFits=()=>browser.evaluate(`(()=>{const menu=document.querySelector('.custom-select-menu');if(!menu)return false;const rect=menu.getBoundingClientRect();return rect.width>100&&rect.height>60&&rect.left>=0&&rect.top>=0&&rect.right<=innerWidth+1&&rect.bottom<=innerHeight+1;})()`);
 const open=async selector=>{await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await wait('Boolean(document.querySelector(".custom-select-menu"))');await delay(100);assert.equal(await menuFits(),true,'Dropdown must stay inside the viewport');};
 const snapshot=async path=>{const{data}=await browser.call('Page.captureScreenshot',{format:'png'});await writeFile(path,Buffer.from(data,'base64'));};

 // Both the native top layer and the fallback must escape clipped/transformed containers.
 for(const fallback of [false,true]){
  await navigate(fallback?'?fallback=1':'');
  await wait('Boolean(document.querySelector("dialog[open] #stress-variant-container"))');
  await open('#stress-variant-container [aria-haspopup=listbox]');
  await wait('document.querySelectorAll(".custom-select-menu [role=option]").length===20&&Boolean(document.querySelector(".custom-select-footer"))');
  assert.equal(await menuFits(),true);
  assert.equal(await browser.evaluate(`(()=>{const box=document.querySelector('.custom-select-menu').getBoundingClientRect();const clip=document.querySelector('#clipped-container').getBoundingClientRect();return box.bottom>clip.bottom&&document.elementFromPoint(box.left+20,box.bottom-20)?.closest('.custom-select-menu')!==null;})()`),true,'Dropdown must remain interactive outside its clipping ancestor');
  assert.equal(await browser.evaluate(`(()=>{const menu=document.querySelector('.custom-select-menu');const label=menu.querySelector('[role=option] span');return label.scrollWidth<=label.clientWidth+1;})()`),true,'Long product labels must wrap instead of being cut off');
  await browser.evaluate(`(()=>{const options=document.querySelector('.custom-select-options');options.scrollTop=options.scrollHeight;})()`);
  assert.equal(await browser.evaluate(`(()=>{const menu=document.querySelector('.custom-select-menu').getBoundingClientRect();const search=document.querySelector('.custom-select-menu input').getBoundingClientRect();const footer=document.querySelector('.custom-select-footer').getBoundingClientRect();return search.top>=menu.top&&search.bottom<=menu.bottom&&footer.top>=menu.top&&footer.bottom<=menu.bottom+1;})()`),true,'Search and pagination must stay visible while options scroll');
  await browser.evaluate(`document.querySelector('.custom-select-footer button[title="Keyingi sahifa"]').click()`);
  await wait('selectionQA.requests.some(row=>row.page===2)&&document.querySelector(".custom-select-menu [role=option]").textContent.includes("00021")');
  assert.equal(await browser.evaluate('Boolean(document.querySelector("dialog[open]"))'),true,'Pagination must not dismiss its dialog');
  await browser.evaluate('document.querySelector(".custom-select-menu input").focus()');
  await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await browser.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await browser.evaluate('selectionQA.submits'),0,'Searching must not submit the underlying form');
  await escape();
  await wait('!document.querySelector(".custom-select-menu")');
  assert.equal(await browser.evaluate('Boolean(document.querySelector("dialog[open]"))'),true,'Escape closes the menu before the dialog');
  await open('#stress-variant-container [aria-haspopup=listbox]');
  await wait('document.querySelectorAll(".custom-select-menu [role=option]").length===20');
  await browser.evaluate('document.querySelector(".custom-select-menu [role=option]").click()');
  await wait('selectionQA.selected!==null&&!document.querySelector(".custom-select-menu")');
  await browser.evaluate('document.querySelector("#stress-category-container").scrollIntoView({block:"end"})');
  await open('#stress-category-container [aria-haspopup=listbox]');
  assert.equal(await browser.evaluate(`(()=>{const menu=document.querySelector('.custom-select-menu').getBoundingClientRect();const trigger=document.querySelector('#stress-category-container [aria-haspopup]').getBoundingClientRect();return menu.bottom<=trigger.top+1;})()`),true,'A low category selector must open upward');
  await browser.resize(390,700);await delay(150);assert.equal(await menuFits(),true,'Open dropdown must reposition on mobile resize');
  await browser.resize(740,360);await delay(150);assert.equal(await menuFits(),true,'Open dropdown must fit a short landscape viewport');
  await browser.evaluate('document.querySelector("dialog[open] button[aria-label=Yopish]").click()');
  await wait('!document.querySelector("dialog[open]")&&!document.querySelector(".custom-select-menu")');
  await browser.resize(1280,900);
 }

 // The four real inventory operations share the remote product selector.
 await navigate('?screen=inventory');
 await wait('[...document.querySelectorAll("button")].some(node=>node.textContent.trim()==="Ta’minotchiga Qaytarish")');
 for(const operation of ['Ta’minotchiga Qaytarish','Tuzatish','Mijoz Qaytardi (Cheksiz)','Hisobdan Chiqarish']){
  await click(operation);await wait('Boolean(document.querySelector("dialog[open]"))');await delay(250);
  assert.equal(await browser.evaluate('document.querySelector("dialog[open]").getBoundingClientRect().width>=750'),true,'Product selection dialogs must have adequate desktop width');
  await open('dialog[open] .custom-select-wrapper [aria-haspopup=listbox]');
  await wait('document.querySelectorAll(".custom-select-menu [role=option]").length===20');
  assert.equal(await menuFits(),true);
  if(operation==='Ta’minotchiga Qaytarish')await snapshot('/tmp/ilbi-supplier-return-select.png');
  await browser.resize(390,740);await delay(150);assert.equal(await menuFits(),true);
  assert.equal(await browser.evaluate('document.querySelector("dialog[open] .dialog-content").scrollWidth<=document.querySelector("dialog[open] .dialog-content").clientWidth+1'),true);
  await escape();await escape();await wait('!document.querySelector("dialog[open]")');await browser.resize(1280,900);
 }

 await navigate('?screen=catalog');await wait('[...document.querySelectorAll("button")].some(node=>node.textContent.trim()==="Yangi Tovar")');
 await click('Yangi Tovar');await wait('Boolean(document.querySelector("dialog[open]"))');await delay(250);
 await open('dialog[open] .custom-select-wrapper [aria-haspopup=listbox]');
 await escape();await escape();await wait('!document.querySelector("dialog[open]")');
 await click('Kategoriyalarni Boshqarish');await wait('Boolean(document.querySelector("dialog[open]"))');
 await click('Yangi Kategoriya');await wait('document.querySelectorAll("dialog[open]").length===2');await delay(250);
 await browser.evaluate(`[...document.querySelectorAll('dialog[open]')].at(-1).querySelector('[aria-haspopup=listbox]').click()`);
 await wait('Boolean(document.querySelector(".custom-select-menu"))');await delay(100);assert.equal(await menuFits(),true,'Parent category selector must escape nested category dialogs');
 await escape();assert.equal(await browser.evaluate('document.querySelectorAll("dialog[open]").length'),2);

 await navigate('?screen=b2b');await wait('[...document.querySelectorAll("button")].some(node=>node.textContent.trim()==="Qabul Qilish")');
 await click('Qabul Qilish');await wait('Boolean(document.querySelector("dialog[open] .custom-select-wrapper"))');await delay(250);
 await open('dialog[open] .custom-select-wrapper [aria-haspopup=listbox]');
 assert.equal(await menuFits(),true,'B2B category mapping selector must fit above its scrolling items');
 await browser.resize(390,740);await delay(150);assert.equal(await menuFits(),true);
 await snapshot('/tmp/ilbi-category-select-mobile.png');
 assert.deepEqual(browser.errors,[]);
 console.log('PASS dropdown geometry: native/fallback, clipped and transformed containers, pinned search/pagination, long labels, keyboard/close behavior, mobile/landscape, four inventory operations, catalog/nested categories and B2B mapping.');
}finally{if(browser)await browser.close();if(server)await server.close();}
