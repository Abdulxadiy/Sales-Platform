const status = document.querySelector('#status');
function showStatus(kind, message) {
  status.hidden = false;
  status.className = `setup-status is-${kind}`;
  status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  document.querySelector('#status-title').textContent = kind === 'error' ? 'Sozlashni tugatib bo‘lmadi' : 'ILBI tayyorlanmoqda';
  document.querySelector('#status-message').textContent = message;
  document.querySelector('#status-guide').hidden = kind !== 'error';
}
async function openGuide() {
  try { await window.ilbiDesktop.openGuide(); }
  catch (error) { showStatus('error', error.message); }
}
document.querySelector('#guide').addEventListener('click', openGuide);
document.querySelector('#updates').addEventListener('click', () => { void window.ilbiDesktop.openUpdates().then(() => window.ilbiDesktop.checkForUpdates()).catch(error => showStatus('error', error.message)); });
document.querySelector('#status-guide').addEventListener('click', openGuide);
async function perform(action) {
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  showStatus('busy', 'Birinchi tayyorlash biroz vaqt olishi mumkin. Shu oynani ochiq qoldiring.');
  try { await action(); }
  catch (error) { showStatus('error', error.message); }
  finally { document.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
}
document.querySelector('#host').addEventListener('submit', event => {
  event.preventDefault(); void perform(() => window.ilbiDesktop.setup());
});
let joining=false;
document.querySelector('#join').addEventListener('click', () => { void perform(async()=>{
  const code=document.querySelector('#join-code').value.replace(/[ -]/g,'');
  if(!/^\d{8}$/.test(code))throw Error('Asosiy kassadagi 8 xonali kodni kiriting.');
  let state=await window.ilbiDesktop.join(code);joining=true;
  document.querySelector('#join-wait').hidden=false;
  document.querySelector('#join-fingerprint').textContent='Tasdiqlash belgisi: '+state.fingerprint;
  showStatus('busy','Asosiy kassada do‘kon egasining tasdig‘i kutilmoqda.');
  try{
    while(joining){
      document.querySelector('#join-countdown').textContent='Qolgan vaqt: '+Math.floor(state.remaining/60)+':'+String(state.remaining%60).padStart(2,'0');
      if(state.state==='completed')break;
      await new Promise(resolve=>setTimeout(resolve,1000));
      state=await window.ilbiDesktop.getJoinState();
    }
  }finally{joining=false;document.querySelector('#join-wait').hidden=true;}
}); });
void window.ilbiDesktop.getSetupState?.().then(state=>{
  if(state.mode==='client'){
    document.querySelector('#host').hidden=true;document.querySelector('#join-details').open=true;
    if(state.requiresRejoin)showStatus('error','Eski ulanish fayli o‘rniga asosiy kassadagi yangi kod bilan bir marta qayta ulang. Do‘kon ma’lumotlari o‘chirilmaydi.');
  }
}).catch(()=>{});
