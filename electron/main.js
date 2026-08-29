const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

// Suppress unhandled crash dialogs
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

function getAppPaths() {
  const isPackaged = app.isPackaged;
  const root = path.join(__dirname, '..');
  
  const standaloneServer = path.join(root, 'frontend', '.next', 'standalone', 'server.js');
  const devNextCli = path.join(root, 'frontend', 'node_modules', 'next', 'dist', 'bin', 'next');

  let frontendServerScript = '';
  let frontendCwd = '';
  if (fs.existsSync(standaloneServer)) {
    frontendServerScript = standaloneServer;
    frontendCwd = path.join(root, 'frontend', '.next', 'standalone');
  } else {
    frontendServerScript = devNextCli;
    frontendCwd = path.join(root, 'frontend');
  }

  return {
    isPackaged,
    backendDir: path.join(root, 'backend'),
    backendDist: path.join(root, 'backend', 'dist', 'main.js'),
    frontendCwd,
    frontendServerScript,
    isStandalone: frontendServerScript.endsWith('server.js'),
  };
}

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
      req.setTimeout(1500, () => {
        req.destroy();
        retry();
      });
      req.end();
    };

    const retry = () => {
      if (Date.now() - startTime >= timeoutMs) {
        resolve(false);
      } else {
        setTimeout(check, 200);
      }
    };

    check();
  });
}

function spawnNodeProcess(scriptPath, args, cwd, customEnv) {
  const isPackaged = app.isPackaged;
  const nodeBinary = isPackaged ? process.execPath : 'node';

  const env = {
    ...process.env,
    ...(isPackaged ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
    ...customEnv,
  };

  return spawn(nodeBinary, [scriptPath, ...args], {
    cwd,
    env,
    stdio: 'pipe',
    shell: false,
  });
}

function startBackendServer() {
  if (backendProcess) return;
  const { backendDir, backendDist } = getAppPaths();

  if (!fs.existsSync(backendDist)) {
    console.warn(`[Backend]: dist/main.js not found at ${backendDist}`);
    return;
  }

  try {
    console.log(`[Electron]: Spawning TextBoard Backend Engine on port ${BACKEND_PORT}...`);
    backendProcess = spawnNodeProcess(backendDist, [], backendDir, {
      PORT: BACKEND_PORT,
      NODE_ENV: 'production',
      CORS_ORIGIN: `http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT},http://localhost:3000,http://127.0.0.1:3000`,
    });

    backendProcess.on('error', (err) => {
      console.error('[Backend Spawn Error]:', err.message);
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
  if (frontendProcess) return;
  const { frontendCwd, frontendServerScript, isStandalone } = getAppPaths();

  if (!fs.existsSync(frontendServerScript)) {
    console.warn(`[Frontend]: Server script not found at ${frontendServerScript}`);
    return;
  }

  try {
    console.log(`[Electron]: Spawning TextBoard UI on port ${FRONTEND_PORT}...`);
    const args = isStandalone ? [] : ['start', '-p', FRONTEND_PORT];
    frontendProcess = spawnNodeProcess(frontendServerScript, args, frontendCwd, {
      PORT: FRONTEND_PORT,
      HOSTNAME: '127.0.0.1',
      BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}`,
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${BACKEND_PORT}`,
    });

    frontendProcess.on('error', (err) => {
      console.error('[Frontend Spawn Error]:', err.message);
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
    backgroundColor: '#04060c',
    title: 'TextBoard — Visual Intelligence & Forensic Analytics Workstation',
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    show: true,
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

  // Display instant loading card immediately with 0 delay
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            margin: 0;
            background-color: #04060c;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
            user-select: none;
          }
          .card {
            background: rgba(10, 15, 29, 0.9);
            border: 1px solid rgba(0, 240, 255, 0.25);
            padding: 36px 52px;
            border-radius: 24px;
            text-align: center;
            box-shadow: 0 24px 60px rgba(0,0,0,0.85), 0 0 35px rgba(0,240,255,0.18), inset 0 1px 1px rgba(255,255,255,0.15);
          }
          .title {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
            background: linear-gradient(135deg, #00f0ff, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 24px;
            letter-spacing: 0.5px;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(0, 240, 255, 0.15);
            border-top-color: #00f0ff;
            border-radius: 50%;
            animation: spin 0.75s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">TEXTBOARD</div>
          <div class="subtitle">INITIALIZING FORENSIC WORKSTATION...</div>
          <div class="spinner"></div>
        </div>
      </body>
    </html>
  `)}`);

  const frontendAppUrl = `http://127.0.0.1:${FRONTEND_PORT}`;

  // Start backend & frontend concurrently
  startBackendServer();
  startFrontendServer();

  // Poll 127.0.0.1 every 200ms and load as soon as ready
  const isReady = await checkHealth(frontendAppUrl, 25000);
  if (isReady && mainWindow) {
    mainWindow.loadURL(frontendAppUrl);
  } else if (mainWindow) {
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.loadURL(frontendAppUrl);
      }
    }, 1500);
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
