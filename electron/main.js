const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

// Prevent global uncaught exception dialog popups
process.on('uncaughtException', (err) => {
  console.error('[Electron Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Electron Unhandled Rejection]:', reason);
});

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;

const FRONTEND_PORT = process.env.TEXTBOARD_FRONTEND_PORT || '3890';
const BACKEND_PORT = process.env.TEXTBOARD_BACKEND_PORT || '3891';

function checkHealth(url, timeoutMs = 25000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 500) {
            resolve(true);
          } else {
            retry();
          }
        });
      });
      req.on('error', () => retry());
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
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

function resolveNodeBinary() {
  // Use system 'node' or Electron's embedded node runtime
  return 'node';
}

function startBackendServer() {
  const backendDistPath = path.join(__dirname, '..', 'backend', 'dist', 'main.js');
  const backendDir = path.join(__dirname, '..', 'backend');

  if (!fs.existsSync(backendDistPath)) {
    console.warn(`[Backend]: dist/main.js not found at ${backendDistPath}`);
    return;
  }

  try {
    const nodeBin = resolveNodeBinary();
    console.log(`[Electron]: Spawning TextBoard Backend Engine on port ${BACKEND_PORT}...`);
    backendProcess = spawn(nodeBin, [backendDistPath], {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: BACKEND_PORT,
        NODE_ENV: 'production',
      },
      stdio: 'pipe',
      shell: false,
    });

    backendProcess.on('error', (err) => {
      console.error('[Backend Process Spawn Error]:', err.message);
    });

    backendProcess.stdout?.on('data', (data) => {
      console.log(`[Backend]: ${data}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      console.error(`[Backend Error]: ${data}`);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`Backend process exited (code=${code}, signal=${signal})`);
      backendProcess = null;
    });
  } catch (err) {
    console.error('Failed to spawn backend process:', err);
  }
}

function startFrontendServer() {
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const nextCliPath = path.join(frontendDir, 'node_modules', 'next', 'dist', 'bin', 'next');

  if (!fs.existsSync(nextCliPath)) {
    console.warn(`[Frontend]: Next CLI not found at ${nextCliPath}`);
    return;
  }

  try {
    const nodeBin = resolveNodeBinary();
    console.log(`[Electron]: Spawning TextBoard Next.js UI on port ${FRONTEND_PORT}...`);
    frontendProcess = spawn(nodeBin, [nextCliPath, 'start', '-p', FRONTEND_PORT], {
      cwd: frontendDir,
      env: {
        ...process.env,
        PORT: FRONTEND_PORT,
        BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}`,
      },
      stdio: 'pipe',
      shell: false,
    });

    frontendProcess.on('error', (err) => {
      console.error('[Frontend Process Spawn Error]:', err.message);
    });

    frontendProcess.stdout?.on('data', (data) => {
      console.log(`[Frontend]: ${data}`);
    });

    frontendProcess.stderr?.on('data', (data) => {
      console.error(`[Frontend Error]: ${data}`);
    });

    frontendProcess.on('exit', (code, signal) => {
      console.log(`Frontend process exited (code=${code}, signal=${signal})`);
      frontendProcess = null;
    });
  } catch (err) {
    console.error('Failed to spawn frontend process:', err);
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const backendHealthUrl = `http://127.0.0.1:${BACKEND_PORT}/health`;
  const frontendAppUrl = `http://localhost:${FRONTEND_PORT}`;

  // Start backend if not already responsive
  const isBackendUp = await checkHealth(backendHealthUrl, 1500);
  if (!isBackendUp) {
    startBackendServer();
  }

  // Start frontend if not already responsive
  const isFrontendUp = await checkHealth(frontendAppUrl, 1500);
  if (!isFrontendUp) {
    startFrontendServer();
  }

  // Wait for frontend server to serve pages
  const isReady = await checkHealth(frontendAppUrl, 25000);
  if (isReady && mainWindow) {
    mainWindow.loadURL(frontendAppUrl);
  } else if (mainWindow) {
    mainWindow.loadURL(`data:text/html,
      <html>
        <head><title>TextBoard Starting...</title></head>
        <body style="background:#090c10;color:#22d3ee;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
          <h2 style="letter-spacing:2px;text-transform:uppercase;">⚡ TEXTBOARD WORKSTATION</h2>
          <p style="color:#94a3b8;font-size:12px;">Starting local analytics engine on port ${FRONTEND_PORT}...</p>
          <script>setTimeout(() => window.location.href = "${frontendAppUrl}", 2000);</script>
        </body>
      </html>
    `);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
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

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPlatform', () => process.platform);

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
    try { backendProcess.kill(); } catch {}
    backendProcess = null;
  }
  if (frontendProcess) {
    try { frontendProcess.kill(); } catch {}
    frontendProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
