const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('textboardNative', {
  isDesktop: true,
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
});
