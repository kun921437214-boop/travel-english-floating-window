const path = require('node:path');
const { app, BrowserWindow, ipcMain, screen } = require('electron');

app.setName('哑巴说话');
app.setPath('userData', path.join(app.getPath('appData'), 'travel-english-floating-window'));

let mainWindow = null;
let alwaysOnTop = true;
let readyToShow = false;
let rendererReady = false;
let showFallbackTimer = null;

function getWindowPosition(width, height) {
  const display = screen.getPrimaryDisplay();
  const { x, y, width: workWidth } = display.workArea;
  return {
    x: Math.round(x + workWidth - width - 24),
    y: Math.round(y + 24)
  };
}

function clampBoundsToDisplay(bounds, display, margin = 16) {
  const workArea = display.workArea;
  const maxWidth = Math.max(340, workArea.width - margin * 2);
  const maxHeight = Math.max(160, workArea.height - margin * 2);
  const width = Math.min(Math.max(340, Math.round(bounds.width)), maxWidth);
  const height = Math.min(Math.max(160, Math.round(bounds.height)), maxHeight);
  const minX = workArea.x + margin;
  const minY = workArea.y + margin;
  const maxX = workArea.x + workArea.width - width - margin;
  const maxY = workArea.y + workArea.height - height - margin;

  return {
    width,
    height,
    x: Math.min(Math.max(Math.round(bounds.x), minX), maxX),
    y: Math.min(Math.max(Math.round(bounds.y), minY), maxY)
  };
}

function clampWindowToDisplay() {
  if (!mainWindow) return false;
  const bounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  mainWindow.setBounds(clampBoundsToDisplay(bounds, display));
  return true;
}

function showWindowWhenReady() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (!readyToShow || !rendererReady) return false;
  if (showFallbackTimer) {
    clearTimeout(showFallbackTimer);
    showFallbackTimer = null;
  }
  clampWindowToDisplay();
  if (!mainWindow.isVisible()) mainWindow.show();
  return true;
}

function createWindow() {
  const width = 540;
  const height = 300;
  const position = getWindowPosition(width, height);
  readyToShow = false;
  rendererReady = false;
  if (showFallbackTimer) {
    clearTimeout(showFallbackTimer);
    showFallbackTimer = null;
  }

  mainWindow = new BrowserWindow({
    width,
    height,
    x: position.x,
    y: position.y,
    minWidth: 340,
    minHeight: 160,
    resizable: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    show: false,
    autoHideMenuBar: true,
    title: '哑巴说话',
    alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setAlwaysOnTop(alwaysOnTop, 'floating');

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL(devServerUrl);
  }

  mainWindow.once('ready-to-show', () => {
    readyToShow = true;
    clampWindowToDisplay();
    showWindowWhenReady();
    showFallbackTimer = setTimeout(() => {
      rendererReady = true;
      showWindowWhenReady();
    }, 3000);
  });

  mainWindow.on('closed', () => {
    if (showFallbackTimer) {
      clearTimeout(showFallbackTimer);
      showFallbackTimer = null;
    }
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

ipcMain.handle('window:toggle-always-on-top', () => {
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

ipcMain.handle('window:get-always-on-top-status', () => {
  if (mainWindow) {
    alwaysOnTop = mainWindow.isAlwaysOnTop();
  }
  return alwaysOnTop;
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('window:close', () => {
  app.quit();
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:reload', () => {
  if (mainWindow) mainWindow.reload();
});

function setWindowSize(width, height) {
  if (!mainWindow) return false;
  const currentBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(currentBounds);
  const nextWidth = Math.max(340, Math.round(Number(width) || currentBounds.width));
  const nextHeight = Math.max(160, Math.round(Number(height) || currentBounds.height));
  mainWindow.setMinimumSize(340, 160);
  mainWindow.setBounds(
    clampBoundsToDisplay({
      ...currentBounds,
      width: nextWidth,
      height: nextHeight
    }, display)
  );
  return true;
}

ipcMain.handle('set-window-size', (_event, width, height) => setWindowSize(width, height));

ipcMain.handle('window:set-size', (_event, width, height) => setWindowSize(width, height));

ipcMain.handle('window:get-size', () => {
  if (!mainWindow) return null;
  const { width, height } = mainWindow.getBounds();
  return { width, height };
});

ipcMain.handle('window:clamp-to-screen', () => clampWindowToDisplay());

ipcMain.handle('window:renderer-ready', () => {
  rendererReady = true;
  return showWindowWhenReady();
});

ipcMain.handle('set-window-position-top-right', (_event, width, height) => {
  if (!mainWindow) return false;
  const nextWidth = Math.max(340, Math.round(Number(width) || 540));
  const nextHeight = Math.max(160, Math.round(Number(height) || 300));
  const position = getWindowPosition(nextWidth, nextHeight);
  const display = screen.getPrimaryDisplay();
  mainWindow.setBounds(
    clampBoundsToDisplay({
      ...position,
      width: nextWidth,
      height: nextHeight
    }, display)
  );
  return true;
});
