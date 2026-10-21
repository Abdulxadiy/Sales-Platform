const status = document.querySelector('#status');
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
