const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ilbiDesktop', Object.freeze({
  version: '1.2.0',
  setup: () => ipcRenderer.invoke('ilbi:setup'),
  join: () => ipcRenderer.invoke('ilbi:join'),
  exportPairing: () => ipcRenderer.invoke('ilbi:pairing'),
  openGuide: () => ipcRenderer.invoke('ilbi:guide'),
}));
