import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;
let isShuttingDown = false;

// Detectar si estamos en desarrollo
const isDev = process.env.ELECTRON_DEV === 'true' || !app.isPackaged;
const PORT = 3000;
const USER_DATA_DIR = app.getPath('userData');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.ico')
  });

  // Load the web application from localhost server
  const startUrl = `http://localhost:${PORT}`;
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function startServer() {
  return new Promise((resolve, reject) => {
    // En producción, server.js está desempaquetado fuera del ASAR
    let serverPath = path.join(__dirname, 'server.js');
    let workingDir = __dirname;
    
    console.log('[Main] __dirname:', __dirname);
    console.log('[Main] app.isPackaged:', app.isPackaged);
    console.log('[Main] Initial serverPath:', serverPath);
    
    // Si estamos en ASAR, usar la ruta desempaquetada
    if (serverPath.includes('app.asar')) {
      serverPath = serverPath.replace('app.asar', 'app.asar.unpacked');
      workingDir = workingDir.replace('app.asar', 'app.asar.unpacked');
      console.log('[Main] ASAR detected, using unpacked paths');
      console.log('[Main] serverPath:', serverPath);
      console.log('[Main] workingDir:', workingDir);
    }
    
    console.log('[Main] Final serverPath:', serverPath);
    console.log('[Main] Final workingDir:', workingDir);
    console.log('[Main] USER_DATA_DIR:', USER_DATA_DIR);
    
    serverProcess = spawn('node', [serverPath], {
      cwd: workingDir,
      env: {
        ...process.env,
        PORT: PORT,
        ELECTRON_APP: 'true',
        USER_DATA_DIR
      },
      stdio: 'pipe'
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server] ${output}`);
      
      // Detect when the server is ready to accept requests
      if (output.includes('listening') || output.includes('started')) {
        if (!serverReady) {
          serverReady = true;
          resolve();
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Error al iniciar el servidor:', err);
      reject(err);
    });

    // Timeout de 10 segundos
    setTimeout(() => {
      if (serverReady) return;
      resolve();
    }, 10000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL');
      }
      resolve();
    }, 5000);

    serverProcess.kill('SIGTERM');
    serverProcess.on('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

// Manejadores IPC
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

ipcMain.handle('app:get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('app:get-app-path', () => {
  return app.getAppPath();
});

ipcMain.handle('app:quit', async () => {
  app.quit();
});

// Evento: App listo
app.on('ready', async () => {
  try {
    console.log('Iniciando servidor Express...');
    await startServer();
    
    console.log('Creando ventana...');
    createWindow();

    createMenu();
  } catch (err) {
    console.error('Error al iniciar la aplicación:', err);
    app.quit();
  }
});

// Evento: Todas las ventanas cerradas
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    isShuttingDown = true;
    await stopServer();
    app.quit();
  }
});

// Evento: App activada (macOS)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Manejador para cerrar correctamente
app.on('before-quit', async (event) => {
  if (!isShuttingDown) {
    event.preventDefault();
    isShuttingDown = true;
    await stopServer();
    app.quit();
  }
});

function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'DevTools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de',
          click: () => {
            // Show about dialog (can be implemented)
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
