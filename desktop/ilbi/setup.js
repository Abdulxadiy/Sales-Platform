const status = document.querySelector('#status');
document.querySelector('#guide').addEventListener('click', () => {
  void window.ilbiDesktop.openGuide().catch(error => { status.textContent = error.message; });
});
async function perform(action) {
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  status.textContent = 'Tayyorlanmoqda… Birinchi ishga tushish biroz vaqt olishi mumkin.';
  try { await action(); }
  catch (error) { status.textContent = error.message; }
  finally { document.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
}
document.querySelector('#host').addEventListener('submit', event => {
  event.preventDefault(); void perform(() => window.ilbiDesktop.setup({ server: new FormData(event.target).get('server') }));
});
document.querySelector('#join').addEventListener('click', () => { void perform(() => window.ilbiDesktop.join()); });
