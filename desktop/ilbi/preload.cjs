const { contextBridge, ipcRenderer } = require('electron');
async function invoke(channel, ...args) {
  try { return await ipcRenderer.invoke(channel, ...args); }
  catch (error) {
    // Electron adds transport details which are not useful in the setup window.
    throw new Error(error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, ''));
  }
}
contextBridge.exposeInMainWorld('ilbiDesktop', Object.freeze({
  version: '1.2.0',
  setup: () => invoke('ilbi:setup'),
  join: () => invoke('ilbi:join'),
  exportPairing: () => invoke('ilbi:pairing'),
  openGuide: () => invoke('ilbi:guide'),
  openDownloads: () => invoke('ilbi:downloads'),
  saveDocumentPDF: document => invoke('ilbi:document-pdf', document),
  receiptShareLinks: tokens => invoke('ilbi:receipt-share-links', tokens),
}));
