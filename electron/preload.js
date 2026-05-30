const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('set-always-on-top', Boolean(value)),
  getAlwaysOnTopStatus: () => ipcRenderer.invoke('get-always-on-top-status'),
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),
  quitApp: () => ipcRenderer.invoke('quit-app')
});
