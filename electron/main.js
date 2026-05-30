const path = require('node:path');
const { app, BrowserWindow, ipcMain, screen } = require('electron');

let mainWindow = null;
let alwaysOnTop = true;

function getWindowPosition(width, height) {
  const display = screen.getPrimaryDisplay();
  const { x, y, width: workWidth } = display.workArea;
  return {
    x: Math.round(x + workWidth - width - 24),
    y: Math.round(y + 24)
  };
}

function createWindow() {
  const width = 360;
  const height = 220;
  const position = getWindowPosition(width, height);

  mainWindow = new BrowserWindow({
    width,
    height,
    x: position.x,
    y: position.y,
    minWidth: 320,
    minHeight: 180,
    resizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    show: false,
    title: '澳新旅行英语悬浮卡片',
    alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setAlwaysOnTop(alwaysOnTop, 'floating');

  if (process.platform === 'darwin') {
    try {
      mainWindow.setVibrancy('hud');
    } catch {
      // Vibrancy support varies by Electron/macOS version; the CSS glass card remains the fallback.
    }
  }

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL(devServerUrl);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('toggle-always-on-top', () => {
  alwaysOnTop = !alwaysOnTop;
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(alwaysOnTop, 'floating');
  }
  return alwaysOnTop;
});

ipcMain.handle('set-always-on-top', (_event, value) => {
  alwaysOnTop = Boolean(value);
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(alwaysOnTop, 'floating');
  }
  return alwaysOnTop;
});

ipcMain.handle('get-always-on-top-status', () => {
  if (mainWindow) {
    alwaysOnTop = mainWindow.isAlwaysOnTop();
  }
  return alwaysOnTop;
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('set-window-size', (_event, width, height) => {
  if (!mainWindow) return false;
  const nextWidth = Math.max(320, Math.round(Number(width) || 360));
  const nextHeight = Math.max(160, Math.round(Number(height) || 220));
  if (nextHeight < 180) {
    mainWindow.setMinimumSize(320, 160);
  } else {
    mainWindow.setMinimumSize(320, 180);
  }
  const position = getWindowPosition(nextWidth, nextHeight);
  mainWindow.setBounds({
    width: nextWidth,
    height: nextHeight,
    x: position.x,
    y: position.y
  });
  return true;
});
