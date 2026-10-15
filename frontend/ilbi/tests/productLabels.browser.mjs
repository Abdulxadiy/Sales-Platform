import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {launchBrowser} from './browser/chrome.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const pause=ms=>new Promise(r=>setTimeout(r,ms));let server,browser;
try{
 server=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});await server.listen();browser=await launchBrowser({width:1000,height:1000});
 await browser.call('Page.navigate',{url:`http://127.0.0.1:${server.httpServer.address().port}/tests/browser/productLabels.html`});
 const check=async expr=>{for(let i=0;i<150;i++){if(await browser.evaluate(expr))return;await pause(40);}throw Error('Timeout '+expr);};
 await check('Boolean(window.labelQA && document.querySelector("iframe")?.srcdoc.includes("2083638774589"))');
 assert.equal(await browser.evaluate('labelQA.generations'),0);assert.equal(await browser.evaluate('labelQA.changed'),0);
 assert.equal(await browser.evaluate('document.querySelectorAll("input[type=checkbox]").length'),2);
 assert.equal(await browser.evaluate('document.body.innerText.includes("INV-")'),false);
 async function preview(){
   // Remove sandbox only inside the test so layout can be inspected from CDP.
   await browser.evaluate(`(()=>{const frame=document.querySelector('iframe');frame.removeAttribute('sandbox');frame.srcdoc=frame.srcdoc;})()`);
   await check('Boolean(document.querySelector("iframe").contentDocument?.querySelector("svg"))');
   return {evaluate: expression=>browser.evaluate(`document.querySelector('iframe').contentWindow.eval(${JSON.stringify(expression)})`)};
 }
 let frame=await preview();
 let metrics=await frame.evaluate(`(()=>{const l=document.querySelector('.label'),svg=document.querySelector('svg'),code=document.querySelector('.code');const r=e=>e?({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,y:e.getBoundingClientRect().y}):{w:0,h:0,y:0};return {label:r(l),svg:r(svg),code:r(code),number:code?.textContent||svg.getAttribute('aria-label'),bodyWidth:innerWidth,bodyHeight:innerHeight,price:!!document.querySelector('.price'),name:!!document.querySelector('.name')};})()`);
 assert.equal(metrics.number,'2083638774589');assert.equal(metrics.name,true);
 assert.ok(metrics.label.w>metrics.bodyWidth*.97);assert.ok(metrics.label.h>metrics.bodyHeight*.97);
 assert.ok(metrics.svg.w>metrics.label.w*.85);
 await writeFile('/tmp/ilbi-labels-preview.png',Buffer.from((await browser.call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 console.log('PASS preview fills its frame; large vector barcode, required numeric caption, no price/INV; existing barcode unchanged.');
 // Rasterize the printed vector at physical 50x30mm and verify it decodes back
 // to the exact visible digits. This also checks Code128 quiet space survives.
 // Barcode reader module runs in the main frame; pass actual SVG pixels there.
 const svg=await frame.evaluate("document.querySelector('svg').outerHTML");
 const decoded=await browser.evaluate(`(async()=>{const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(${JSON.stringify(svg)});await image.decode();const canvas=document.createElement('canvas');canvas.width=600;canvas.height=360;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,600,360);ctx.drawImage(image,0,25,600,270);const stream=canvas.captureStream(10);const video=document.createElement('video');video.muted=true;video.srcObject=stream;await video.play();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{stream.getTracks().forEach(t=>t.stop());reject(Error('No label decode'));},5000);const reader=labelQA.createBarcodeReader();reader.decodeFromVideoElement(video,(result,error,controls)=>{if(result){controls.stop();clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());resolve(result.getText());}});});})()`);
 assert.equal(decoded,'2083638774589');console.log('PASS printed barcode pixels decode to the mandatory displayed number.');
 await browser.evaluate('document.querySelector("input[type=checkbox]").click()');
 await check('!document.querySelector("iframe").srcdoc.includes("class=\\"name\\"")');frame=await preview();
 assert.equal(await frame.evaluate("Boolean(document.querySelector('.name'))"),false);assert.equal(await frame.evaluate("document.querySelector('.code').textContent"),'2083638774589');
 console.log('PASS hiding the product name keeps the code number visible.');

 // Verify physical print dimensions independently of the enlarged preview.
 await browser.evaluate(`(()=>{const frame=document.createElement('iframe');frame.id='print-check';frame.style.cssText='position:fixed;left:-10000px;width:800px;height:600px';frame.srcdoc=labelQA.labelDocument(labelQA.variant,{format:'a4',width:50,height:30,copies:28,showName:true});document.body.append(frame);})()`);
 await check('Boolean(document.querySelector("#print-check").contentDocument?.querySelector(".label"))');
 const print=await browser.evaluate(`(()=>{const doc=document.querySelector('#print-check').contentDocument;const label=doc.querySelector('.label').getBoundingClientRect();return {width:label.width,height:label.height,labels:doc.querySelectorAll('.label').length,sheets:doc.querySelectorAll('.sheet').length,number:doc.querySelector('.code').textContent};})()`);
 assert.ok(Math.abs(print.width-50*96/25.4)<.1);assert.ok(Math.abs(print.height-30*96/25.4)<.1);assert.equal(print.labels,28);assert.equal(print.sheets,2);assert.equal(print.number,'2083638774589');
 console.log('PASS print retains 50x30mm dimensions and paginates 28 labels on two A4 sheets.');
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 await browser.call('Page.navigate',{url:origin+'/tests/browser/productLabels.html?legacy'});
 await check('Boolean(window.labelQA && document.querySelector("iframe")?.srcdoc.includes("INV-5-20002"))');
 assert.equal(await browser.evaluate('labelQA.generations'),0);
 console.log('PASS existing INV barcode is neither regenerated nor changed.');
 await browser.call('Page.navigate',{url:origin+'/tests/browser/productLabels.html?blank'});
 await check('Boolean(window.labelQA && document.querySelector("[role=alert]"))');
 assert.equal(await browser.evaluate('labelQA.generations'),0);
 await browser.evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Raqamli shtrix-kod yaratish")).click()');
 await check('Boolean(document.querySelector("iframe")?.srcdoc.includes("2000000000022"))');
 assert.equal(await browser.evaluate('labelQA.generations'),1);
 console.log('PASS explicit generation applies only to a product without a barcode.');
 assert.deepEqual(browser.errors,[]);
}finally{if(browser)await browser.close();if(server)await server.close();}
