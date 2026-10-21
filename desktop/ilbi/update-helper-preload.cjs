const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ilbiUpdateProgress', Object.freeze({
  status: () => ipcRenderer.invoke('ilbi:update-progress'),
  onStatus: callback => { const listener = (_event, status) => callback(status); ipcRenderer.on('ilbi:update-status', listener); return () => ipcRenderer.removeListener('ilbi:update-status', listener); },
}));
