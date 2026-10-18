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
 await browser.call('Page.bringToFront');
 const base=`http://127.0.0.1:${server.httpServer.address().port}/tests/browser/selectionDialogs.html`;
 const wait=async expression=>{for(let i=0;i<200;i++){if(await browser.evaluate(expression))return;await delay(35);}throw Error(`Timeout: ${expression}\n${await browser.evaluate('JSON.stringify({qa:window.selectionQA,text:document.body.innerText})')}\n${browser.errors.join('\n')}`);};
 const navigate=async query=>{await browser.call('Page.navigate',{url:base+query});await wait('Boolean(window.selectionQA)&&Boolean(document.querySelector("main"))');};
 const click=async text=>browser.evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(text)});if(!button)throw Error('Missing button: '+${JSON.stringify(text)});button.click();})()`);
 const escape=async()=>{await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await browser.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});};
 const menuFits=(selector='.custom-select-menu')=>browser.evaluate(`(()=>{const menu=document.querySelector(${JSON.stringify(selector)});if(!menu)return false;const rect=menu.getBoundingClientRect();return rect.width>100&&rect.height>60&&rect.left>=0&&rect.top>=0&&rect.right<=innerWidth+1&&rect.bottom<=innerHeight+1;})()`);
 const pointerClick=async selector=>{const {x,y}=await browser.evaluate(`(()=>{const rect=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2};})()`);await browser.call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await browser.call('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});};
 const open=async selector=>{await browser.evaluate(`(()=>{const trigger=document.querySelector(${JSON.stringify(selector)});trigger.blur();trigger.focus();trigger.click();})()`);await wait('Boolean(document.querySelector(".custom-select-menu"))');await delay(100);assert.equal(await menuFits(),true,'Dropdown must stay inside the viewport');};
 const snapshot=async path=>{const{data}=await browser.call('Page.captureScreenshot',{format:'png'});await writeFile(path,Buffer.from(data,'base64'));};
 const contentFits=()=>browser.evaluate('document.querySelector("dialog[open] .dialog-content").scrollWidth<=document.querySelector("dialog[open] .dialog-content").clientWidth+1');

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
  await pointerClick('.custom-select-footer button[title="Keyingi sahifa"]');
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

 // A portalled month menu must still behave as part of its parent calendar.
 for(const fallback of [false,true]){
  await navigate(`?screen=dates${fallback?'&fallback=1':''}`);
  await wait('Boolean(document.querySelector("dialog[open] #calendar-container"))');await delay(250);
  await browser.evaluate('document.querySelector("#calendar-container > [role=button]").click()');
  await wait('Boolean(document.querySelector("#calendar-container .custom-select-wrapper"))');
  await open('#calendar-container .custom-select-wrapper [aria-haspopup=listbox]');
  await pointerClick('.custom-select-menu [role=option]');
  await wait('!document.querySelector(".custom-select-menu")&&document.querySelector("#calendar-container .custom-select-wrapper [aria-haspopup]")?.textContent.includes("Yanvar")');
  await open('#calendar-container .custom-select-wrapper [aria-haspopup=listbox]');
  await escape();await wait('!document.querySelector(".custom-select-menu")');
  assert.equal(await browser.evaluate('Boolean(document.querySelector("#calendar-container .custom-select-wrapper"))&&Boolean(document.querySelector("dialog[open]"))'),true,'Escape must leave the parent calendar and dialog open');
 }

 // Rapid intake has a separate autocomplete, including in older browsers.
 for(const fallback of [false,true]){
  await navigate(`?screen=inventory${fallback?'&fallback=1':''}`);
  await wait('[...document.querySelectorAll("button")].some(node=>node.textContent.trim()==="+ Tovar Kirimi")');
  await click('+ Tovar Kirimi');await wait('Boolean(document.querySelector("dialog[open] input[placeholder^=Shtrix]"))');await delay(250);
  await browser.evaluate(`(()=>{const input=document.querySelector('dialog[open] input[placeholder^=Shtrix]');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Greenfield');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await wait('Boolean(document.querySelector(".rapid-intake-search-menu"))');await delay(150);
  assert.equal(await menuFits('.rapid-intake-search-menu'),true,'Rapid intake autocomplete must fit the desktop viewport');
  await browser.resize(390,740);await delay(150);
  assert.equal(await menuFits('.rapid-intake-search-menu'),true,'Rapid intake autocomplete must fit the mobile viewport');
  assert.equal(await browser.evaluate('document.querySelector("dialog[open] input[placeholder^=Shtrix]").getBoundingClientRect().width>=100'),true,'The mobile search field must retain space for typing');
  assert.equal(await browser.evaluate(`(()=>{const menu=document.querySelector('.rapid-intake-search-menu');return menu.scrollWidth<=menu.clientWidth+1;})()`),true,'Rapid intake product details must wrap on mobile');
  if(!fallback)await snapshot('/tmp/ilbi-rapid-intake-mobile.png');
  await escape();await wait('!document.querySelector(".rapid-intake-search-menu")');
  assert.equal(await browser.evaluate('Boolean(document.querySelector("dialog[open]"))'),true,'Escape closes rapid intake results before the dialog');
  await escape();await wait('!document.querySelector("dialog[open]")');await browser.resize(1280,900);
 }

 // The four real inventory operations share the remote product selector.
 await navigate('?screen=inventory');
 await wait('[...document.querySelectorAll("button")].some(node=>node.textContent.trim()==="Ta’minotchiga Qaytarish")');
 for(const operation of ['Ta’minotchiga Qaytarish','Tuzatish','Mijoz Qaytardi (Cheksiz)','Isrofgarchilik']){
  await click(operation);await wait('Boolean(document.querySelector("dialog[open]"))');await delay(250);
  assert.equal(await browser.evaluate('document.querySelector("dialog[open]").getBoundingClientRect().width>=750'),true,'Product selection dialogs must have adequate desktop width');
  await open('dialog[open] .custom-select-wrapper [aria-haspopup=listbox]');
  await wait('document.querySelectorAll(".custom-select-menu [role=option]").length===20');
  assert.equal(await menuFits(),true);
  if(operation==='Ta’minotchiga Qaytarish'){
   await snapshot('/tmp/ilbi-supplier-return-select.png');
   await browser.resize(709,517);await delay(150);assert.equal(await menuFits(),true,'Supplier return selector must fit the reported small window');
   await snapshot('/tmp/ilbi-supplier-return-small-window.png');
  }
  await browser.resize(390,740);await delay(150);assert.equal(await menuFits(),true);
  assert.equal(await browser.evaluate('document.querySelector("dialog[open] .dialog-content").scrollWidth<=document.querySelector("dialog[open] .dialog-content").clientWidth+1'),true);
  await escape();await escape();await wait('!document.querySelector("dialog[open]")');await browser.resize(1280,900);
 }

 await navigate('?screen=catalog');await wait('[...document.querySelectorAll("button")].some(node=>node.textContent.trim()==="Yangi Tovar")');
 await click('Yangi Tovar');await wait('Boolean(document.querySelector("dialog[open]"))');await delay(250);
 await open('dialog[open] .custom-select-wrapper [aria-haspopup=listbox]');
 await browser.resize(390,740);await delay(150);assert.equal(await menuFits(),true);assert.equal(await contentFits(),true,'The new product form must fit on mobile');
 await escape();await escape();await wait('!document.querySelector("dialog[open]")');
 await browser.resize(1280,900);
 await click('Kategoriyalarni Boshqarish');await wait('Boolean(document.querySelector("dialog[open]"))');
 await browser.resize(390,740);await delay(150);assert.equal(await contentFits(),true,'The category manager must fit on mobile');
 await browser.resize(1280,900);
 await click('Yangi Kategoriya');await wait('Boolean(document.querySelector("dialog[open] [aria-haspopup=listbox]"))');await delay(250);
 await browser.evaluate(`[...document.querySelectorAll('dialog[open]')].at(-1).querySelector('[aria-haspopup=listbox]').click()`);
 await wait('Boolean(document.querySelector(".custom-select-menu"))');await delay(100);assert.equal(await menuFits(),true,'Parent category selector must fit the category dialog');
 await browser.resize(390,740);await delay(150);assert.equal(await menuFits(),true);assert.equal(await contentFits(),true,'The category form must fit on mobile');
 await escape();assert.equal(await browser.evaluate('document.querySelectorAll("dialog[open]").length'),1);
 await browser.resize(1280,900);

 await navigate('?screen=b2b');await wait('[...document.querySelectorAll("button")].some(node=>node.textContent.trim()==="Qabul Qilish")');
 await click('Qabul Qilish');await wait('Boolean(document.querySelector("dialog[open] .custom-select-wrapper"))');await delay(250);
 await open('dialog[open] .custom-select-wrapper [aria-haspopup=listbox]');
 assert.equal(await menuFits(),true,'B2B category mapping selector must fit above its scrolling items');
 await browser.resize(390,740);await delay(150);assert.equal(await menuFits(),true);
 await snapshot('/tmp/ilbi-category-select-mobile.png');
 assert.deepEqual(browser.errors,[]);
 console.log('PASS dropdown geometry: native/fallback, clipped and transformed containers, pinned search/pagination, long labels, pointer/keyboard/close behavior, mobile/landscape, rapid intake, four inventory operations, catalog/categories and B2B mapping.');
}finally{if(browser)await browser.close();if(server)await server.close();}
