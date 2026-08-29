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

function checkHealth(url, timeoutMs = 30000) {
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
  const isReady = await checkHealth(frontendAppUrl, 30000);
  if (isReady && mainWindow) {
    mainWindow.loadURL(frontendAppUrl);
  } else if (mainWindow) {
    // Retry load after waiting
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.loadURL(frontendAppUrl);
      }
    }, 2500);
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
