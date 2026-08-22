const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;

function waitForServer(url, timeoutMs = 20000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.end();
    };

    const retry = () => {
      if (Date.now() - startTime >= timeoutMs) {
        resolve(false);
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#08090e',
    title: 'Textboard — Visual Intelligence Workstation',
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Handle external links safely in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const frontendUrl = process.env.TEXTBOARD_FRONTEND_URL || 'http://localhost:3000';
  
  // Wait for frontend dev/prod server if starting up
  const isReady = await waitForServer(frontendUrl, 10000);
  if (isReady) {
    mainWindow.loadURL(frontendUrl);
  } else {
    // Load fallback splash/connecting page
    mainWindow.loadURL(`data:text/html,
      <html>
        <head><title>Textboard Starting...</title></head>
        <body style="background:#08090e;color:#00f0ff;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
          <h2 style="letter-spacing:2px;text-transform:uppercase;">⚡ TEXTBOARD WORKSTATION</h2>
          <p style="color:#94a3b8;font-size:12px;">Connecting to local workstation engine (${frontendUrl})...</p>
          <script>setTimeout(() => window.location.href = "${frontendUrl}", 2000);</script>
        </body>
      </html>
    `);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for desktop integration
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Communication Streams & Datasets', extensions: ['txt', 'json', 'csv', 'tsv', 'xlsx', 'zip', 'log', 'imessage', 'signal'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options,
  });
  return result;
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
