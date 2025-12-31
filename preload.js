const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  resize: (width, height) => ipcRenderer.invoke('window:resize', { width, height }),
  close: () => ipcRenderer.invoke('window:close'),
  navigate: (page) => ipcRenderer.invoke('window:navigate', page)
});

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const page = document.body.getAttribute('data-page');
    if (page === 'index') window.api?.resize(320, 240);
    else if (page === 'data') window.api?.resize(320, 400);
  }, 100);
});
