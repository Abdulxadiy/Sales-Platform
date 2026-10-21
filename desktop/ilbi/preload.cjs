const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ilbiDesktop', Object.freeze({
  version: '1.2.0',
  setup: value => ipcRenderer.invoke('ilbi:setup', value),
  join: () => ipcRenderer.invoke('ilbi:join'),
  exportPairing: () => ipcRenderer.invoke('ilbi:pairing'),
}));
