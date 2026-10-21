const bridge = window.ilbiDesktop;
let state = {};
function render(value) {
  state = value;
  document.querySelector('#message').textContent = value.message || 'ILBI yangilangan.';
  const busy = ['checking', 'downloading', 'verifying', 'preparing', 'installing'].includes(value.phase);
  const progress = document.querySelector('#progress'); progress.hidden = !busy && value.phase !== 'updated';
  if (value.progress == null) progress.removeAttribute('value'); else progress.value = value.progress;
  document.querySelector('#percent').textContent = value.progress == null ? '' : `${value.progress}%`;
  const action = document.querySelector('#action'); action.hidden = !bridge || ['updated', 'installing'].includes(value.phase); action.disabled = busy;
  action.textContent = ['available', 'error'].includes(value.phase) ? 'Yuklab olish va yangilash' : 'Yangilanishni tekshirish';
  const close = document.querySelector('#close');
  close.hidden = busy || Boolean(window.ilbiUpdateProgress) && value.phase !== 'failed';
  close.textContent = ['current', 'updated', 'failed'].includes(value.phase) ? 'Yopish' : 'Keyinroq';
}
document.querySelector('#action').addEventListener('click', () => {
  const task = ['available', 'error'].includes(state.phase) ? bridge.updateApp() : bridge.checkForUpdates();
  task.catch(error => render({ phase: 'error', message: error.message }));
});
document.querySelector('#close').addEventListener('click', () => window.close());
if (bridge) { bridge.onUpdateStatus(render); bridge.getUpdateStatus().then(render); }
else { window.ilbiUpdateProgress.onStatus(render); window.ilbiUpdateProgress.status().then(render); }
