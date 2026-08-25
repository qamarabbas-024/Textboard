const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow = null;
let backendProcess = null;

function waitForServer(url, timeoutMs = 25000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
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
        setTimeout(check, 600);
      }
    };

    check();
  });
}

function startBackendServer() {
  const backendPath = path.join(__dirname, '..', 'backend', 'dist', 'main.js');
  try {
    backendProcess = spawn(process.execPath, [backendPath], {
      cwd: path.join(__dirname, '..', 'backend'),
      env: {
        ...process.env,
        PORT: '3001',
        NODE_ENV: 'production',
      },
      stdio: 'pipe',
    });

    backendProcess.stdout?.on('data', (data) => {
      console.log(`[Backend]: ${data}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      console.error(`[Backend Error]: ${data}`);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`Backend process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
    });
  } catch (err) {
    console.error('Failed to spawn backend process:', err);
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090c10',
    title: 'TextBoard — Visual Intelligence & Forensic Analytics Workstation',
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

  const backendUrl = 'http://127.0.0.1:3001/health';
  const frontendUrl = process.env.TEXTBOARD_FRONTEND_URL || 'http://localhost:3000';

  // Check if backend is running, if not spawn it
  const isBackendUp = await waitForServer(backendUrl, 1500);
  if (!isBackendUp) {
    console.log('Spawning backend engine locally...');
    startBackendServer();
  }

  // Wait for frontend to be ready
  const isReady = await waitForServer(frontendUrl, 10000);
  if (isReady) {
    mainWindow.loadURL(frontendUrl);
  } else {
    // Fallback loading page
    mainWindow.loadURL(`data:text/html,
      <html>
        <head><title>TextBoard Starting...</title></head>
        <body style="background:#090c10;color:#22d3ee;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
          <h2 style="letter-spacing:2px;text-transform:uppercase;">⚡ TEXTBOARD WORKSTATION</h2>
          <p style="color:#94a3b8;font-size:12px;">Starting local analytics engine...</p>
          <script>setTimeout(() => window.location.href = "${frontendUrl}", 2500);</script>
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
      {
        name: 'Communication Streams & Datasets',
        extensions: ['txt', 'json', 'jsonl', 'csv', 'tsv', 'xlsx', 'zip', 'log', 'gitlog', 'mbox', 'eml', 'docx', 'imessage', 'signal', 'png', 'jpg', 'jpeg', 'webp'],
      },
      { name: 'All Files', extensions: ['*'] },
    ],
    ...options,
  });
  return result;
});

ipcMain.handle('dialog:openDirectory', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
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

app.on('before-quit', () => {
  if (backendProcess) {
    console.log('Terminating background backend process...');
    backendProcess.kill();
    backendProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

