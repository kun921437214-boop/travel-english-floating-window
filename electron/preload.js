const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('set-always-on-top', Boolean(value)),
  getAlwaysOnTopStatus: () => ipcRenderer.invoke('get-always-on-top-status'),
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),
  getWindowSize: () => ipcRenderer.invoke('window:get-size'),
  centerOrClampWindow: () => ipcRenderer.invoke('window:clamp-to-screen'),
  notifyRendererReady: () => ipcRenderer.invoke('window:renderer-ready'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  reloadApp: () => ipcRenderer.invoke('window:reload')
});
