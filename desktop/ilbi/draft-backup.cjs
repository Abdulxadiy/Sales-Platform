// These functions execute in the isolated app page, where IndexedDB owns drafts.
async function captureDrafts(){
  const local=Object.fromEntries(Object.entries(localStorage).filter(([key])=>/^(ilbi|inventra)_(account_draft:|legacy_draft_owner|pos_cart|pos_partner_sale|draft_|stock_intake_full_draft)/.test(key)));
  const database=await new Promise((ok,fail)=>{const request=indexedDB.open('ilbi-account-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>ok(request.result);request.onerror=()=>fail(request.error);});
  try{
    const rows=await new Promise((ok,fail)=>{const tx=database.transaction('files','readonly'),store=tx.objectStore('files'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>ok(keys.result.map((key,i)=>[key,values.result[i]]));tx.onerror=()=>fail(tx.error);});
    const files=await Promise.all(rows.map(async([key,value])=>({key,name:value.name||'',type:value.type||'',data:await new Promise((ok,fail)=>{const reader=new FileReader();reader.onload=()=>ok(reader.result.split(',')[1]);reader.onerror=()=>fail(reader.error);reader.readAsDataURL(value);})})));
    return {local,files};
  }finally{database.close();}
}
async function restoreDrafts(drafts){
  for(const [key,value] of Object.entries(drafts.local||{}))if(/^(ilbi|inventra)_(account_draft:|legacy_draft_owner|pos_cart|pos_partner_sale|draft_|stock_intake_full_draft)/.test(key))localStorage.setItem(key,value);
  const database=await new Promise((ok,fail)=>{const request=indexedDB.open('ilbi-account-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>ok(request.result);request.onerror=()=>fail(request.error);});
  try{await new Promise((ok,fail)=>{const tx=database.transaction('files','readwrite'),store=tx.objectStore('files');for(const row of drafts.files||[]){const bytes=Uint8Array.from(atob(row.data),char=>char.charCodeAt(0));store.put(new File([bytes],row.name,{type:row.type}),row.key);}tx.oncomplete=ok;tx.onerror=()=>fail(tx.error);});}finally{database.close();}
}
module.exports={captureDrafts,restoreDrafts};
