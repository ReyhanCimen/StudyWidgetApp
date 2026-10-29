const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  resize: (width, height) => ipcRenderer.invoke('window:resize', { width, height }),
  close: () => ipcRenderer.invoke('window:close'),
  navigate: (page) => ipcRenderer.invoke('window:navigate', page),
  onPause: (cb) => ipcRenderer.on('power:pause', (e, at) => cb(at))
});

// Make sure each page has its own size. (window.api isn't visible inside preload,
// so this talks to the main process directly.)
window.addEventListener('DOMContentLoaded', () => {
  const page = document.body.getAttribute('data-page');
  if (page === 'index') ipcRenderer.invoke('window:resize', { width: 320, height: 240 });
  else if (page === 'data' || page === 'stats') ipcRenderer.invoke('window:resize', { width: 320, height: 400 });
});
