// Run with Electron's headless Ozone platform; uses synthetic documents and no real save dialogs.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
const { saveDocumentPDF } = require('../document-sharing.cjs');

app.on('window-all-closed',()=>{});
const watchdog=setTimeout(()=>{console.error('PDF export test timed out');app.exit(1);},30000);
app.whenReady().then(async()=>{
  const folder=process.env.ILBI_DOCUMENT_QA_DIR;
  if(!folder)throw Error('ILBI_DOCUMENT_QA_DIR is required');
  await mkdir(folder,{recursive:true});
  const documents=JSON.parse(await readFile(join(folder,'documents.json'),'utf8'));
  for(let index=0;index<documents.length;index++){
    const path=join(folder,`export-${index}.pdf`);
    const result=await saveDocumentPDF({document:documents[index],BrowserWindow,dialog:{async showSaveDialog(){return {canceled:false,filePath:path};}},write:writeFile});
    assert.equal(result.canceled,false);
    const pdf=await readFile(path);assert(pdf.subarray(0,5).equals(Buffer.from('%PDF-')));
    const text=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});
    assert.match(text,/35[\s,]?000/);
    if(documents[index].title.includes('Z-Hisobot'))assert.match(text,/Z\s*-\s*HISOBOT/);
    else{assert.match(text,/Sut 1 L/);assert.match(text,/11[\s,]?500/);}
    if(documents[index].format==='receipt'&&!documents[index].title.includes('Z-Hisobot'))assert.match(text,/QQS/);
    else if(documents[index].format==='invoice')assert.match(text,/INV-1043/);
    const images=execFileSync('pdfimages',['-list',path],{encoding:'utf8'}).split('\n').filter(line=>/^\s*\d+\s+\d+\s+image\s/.test(line));
    if(documents[index].format==='invoice')assert.equal(images.length,2,'both signatures must remain in the PDF');
    else if(!documents[index].title.includes('Z-Hisobot'))assert(images.length>=1,'receipt QR must remain in the PDF');
    assert.doesNotMatch(text,/Ulashish|Chop etish|Yopish/);
    const info=execFileSync('pdfinfo',[path],{encoding:'utf8'});
    if(documents[index].format==='invoice')assert.match(info,/595[^\n]*841|A4/);
    else{assert.match(info,/Pages:\s+1/);const width=Number(info.match(/Page size:\s+([\d.]+)/)?.[1]);assert(Math.abs(width-documents[index].widthMm*72/25.4)<2);}
    console.log(`PASS real Electron PDF: ${documents[index].format}, ${documents[index].widthMm} mm, ${pdf.length} bytes`);
  }
  assert.equal(BrowserWindow.getAllWindows().length,0);
  clearTimeout(watchdog);
  app.quit();
}).catch(error=>{console.error(error);app.exit(1);});
