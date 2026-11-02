const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('deployCommunity', Object.freeze({
  open: () => ipcRenderer.invoke('open-deploy-community')
}));
