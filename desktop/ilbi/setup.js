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
document.querySelector('#join').addEventListener('click', () => { void perform(() => window.ilbiDesktop.join()); });
