const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 320,
    height: 240,
    resizable: true, // 🔹 true olmalı ki boyutlandırma çalışsın
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Maksimize olmasın
  win.on('maximize', (e) => {
    e.preventDefault();
    win.unmaximize();
  });

  // 🔹 will-resize event'ini kaldırdık, çünkü programatik resize'a izin vermeli

  win.loadFile('index.html');
}

// 🔹 Renderer'dan gelen boyut değiştirme isteği
ipcMain.handle('window:resize', (e, size) => {
  if (!win) return;
  const { width, height } = size;
  win.setContentSize(width, height); // 🔹 setContentSize kullan
  win.setResizable(false); // 🔹 boyut ayarlandıktan sonra resize'ı kapat
});

ipcMain.handle('window:close', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.close();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('window:navigate', (e, page) => {
  if (!win) return;
  win.setResizable(true); // 🔹 önce resize'a izin ver
  if (page === 'data' || page === 'stats') {
    win.setContentSize(320, 400); // 🔹 setContentSize kullan
    win.loadFile(page + '.html');
  } else if (page === 'index') {
    win.setContentSize(320, 240); // 🔹 setContentSize kullan
    win.loadFile('index.html');
  }
  win.setResizable(false); // 🔹 sonra tekrar kapat
});

