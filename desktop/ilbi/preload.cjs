const { contextBridge, ipcRenderer } = require('electron');
async function invoke(channel, ...args) {
  try { return await ipcRenderer.invoke(channel, ...args); }
  catch (error) {
    // Electron adds transport details which are not useful in the setup window.
    throw new Error(error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, ''));
  }
}
contextBridge.exposeInMainWorld('ilbiDesktop', Object.freeze({
  version: '1.3.0',
  setup: () => invoke('ilbi:setup'),
  join: code => invoke('ilbi:join',code),
  getJoinState:()=>invoke('ilbi:join-state'),
  getSetupState:()=>invoke('ilbi:setup-state'),
  createPairing:token=>invoke('ilbi:pair-create',token),
  getPairingState:(token,id)=>invoke('ilbi:pair-state',token,id),
  approvePairing:(token,id,expected)=>invoke('ilbi:pair-approve',token,id,expected),
  cancelPairing:(token,id)=>invoke('ilbi:pair-cancel',token,id),
  getRegisters:token=>invoke('ilbi:registers',token),
  getBackupStatus:token=>invoke('ilbi:backup-status',token),
  createBackup:token=>invoke('ilbi:backup-create',token),
  restoreBackup:(token,id,password)=>invoke('ilbi:backup-restore',token,id,password),
  revokeRegister:(token,id)=>invoke('ilbi:register-revoke',token,id),
  exportPairing: () => invoke('ilbi:pairing'),
  openGuide: () => invoke('ilbi:guide'),
  openDownloads: () => invoke('ilbi:downloads'),
  getUpdateStatus: () => invoke('ilbi:update-status'),
  checkForUpdates: () => invoke('ilbi:update-check'),
  openUpdates: () => invoke('ilbi:update-window'),
  updateApp: () => invoke('ilbi:update-run'),
  getSavedLogin: kind => invoke('ilbi:login-read', kind),
  saveLogin: (kind, value) => invoke('ilbi:login-save', kind, value),
  forgetLogin: kind => invoke('ilbi:login-forget', kind),
  lockSession: token => invoke('ilbi:session-lock', token),
  activateSession:token=>invoke('ilbi:session-activate',token),
  noteActivity:()=>invoke('ilbi:session-activity'),
  getSessionLock:()=>invoke('ilbi:session-state'),
  setIdleMinutes:(token,minutes)=>invoke('ilbi:session-timeout',token,minutes),
  onSessionLock:callback=>{const listener=()=>callback();ipcRenderer.on('ilbi:session-locked',listener);return()=>ipcRenderer.removeListener('ilbi:session-locked',listener);},
  onOpenSecurity:callback=>{const listener=()=>callback();ipcRenderer.on('ilbi:open-security',listener);return()=>ipcRenderer.removeListener('ilbi:open-security',listener);},
  onUpdateStatus: callback => { const listener = (_event, status) => callback(status); ipcRenderer.on('ilbi:update-status', listener); return () => ipcRenderer.removeListener('ilbi:update-status', listener); },
  saveDocumentPDF: document => invoke('ilbi:document-pdf', document),
  receiptShareLinks: tokens => invoke('ilbi:receipt-share-links', tokens),
}));
