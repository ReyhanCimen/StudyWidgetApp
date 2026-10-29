const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 320,
    height: 240,
    useContentSize: true,
    resizable: false,     // 🔹 fixed size; pages change it only through setSize()
    maximizable: false,
    fullscreenable: false,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // 🔹 timer keeps ticking normally when the widget is minimized
    }
  });

  // Maksimize olmasın
  win.on('maximize', (e) => {
    e.preventDefault();
    win.unmaximize();
  });

  // 🔹 Block resizing by dragging the edges. Only fires for manual resizing,
  // so setSize() below still works.
  win.on('will-resize', (e) => e.preventDefault());

  win.loadFile('index.html');
}

// 🔹 Change the window size from code, then lock it again.
function setSize(width, height) {
  if (!win || win.isDestroyed()) return;
  win.setResizable(true);
  win.setContentSize(width, height);
  win.setResizable(false);
}

// 🔹 Renderer'dan gelen boyut değiştirme isteği
ipcMain.handle('window:resize', (e, size) => setSize(size.width, size.height));

ipcMain.handle('window:close', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.close();
});

// 🔹 Computer goes to sleep or the screen locks → pause the timer.
// The time is sent along so sleep time isn't counted even if the page handles it after waking.
function pauseTimer() {
  const at = Date.now();
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('power:pause', at));
}

// 🔹 Only one widget at a time: opening the app again just shows the one already running,
// so two timers can't count the same study time twice.
const isFirstInstance = app.requestSingleInstanceLock();
if (!isFirstInstance) app.quit();

app.on('second-instance', () => {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
});

app.whenReady().then(() => {
  if (!isFirstInstance) return;
  createWindow();
  powerMonitor.on('suspend', pauseTimer);
  powerMonitor.on('lock-screen', pauseTimer);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('window:navigate', (e, page) => {
  if (!win) return;
  if (page === 'data' || page === 'stats') {
    setSize(320, 400);
    win.loadFile(page + '.html');
  } else if (page === 'index') {
    setSize(320, 240);
    win.loadFile('index.html');
  }
});

