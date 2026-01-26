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

// Limpiar datos de AppData pero preservar el servidor
ipcMain.handle('app:clean-app-data', async (event, options = {}) => {
  try {
    const userDataPath = app.getPath('userData');
    const serverPath = path.join(userDataPath, 'HytaleServer');
    
    console.log(`[Cleanup] Iniciando limpieza de AppData: ${userDataPath}`);
    
    // Archivos y carpetas a eliminar (excepto HytaleServer si preserveServer es true)
    const itemsToDelete = [
      '.auth-secure',
      'discord-config.json',
      'setup-config.json',
      'server-auth.json',
      '.hytale-downloader-credentials.json',
      '.download-status.json',
      'logs'
    ];
    
    // Eliminar archivos de configuración
    for (const item of itemsToDelete) {
      const itemPath = path.join(userDataPath, item);
      if (fs.existsSync(itemPath)) {
        if (fs.statSync(itemPath).isDirectory()) {
          fs.rmSync(itemPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(itemPath);
        }
        console.log(`[Cleanup] Eliminado: ${item}`);
      }
    }
    
    // Opcionalmente eliminar backups
    if (options.deleteBackups) {
      const backupPath = path.join(userDataPath, 'backups');
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
        console.log(`[Cleanup] Backups eliminados`);
      }
    }
    
    // Opcionalmente eliminar el servidor
    if (options.deleteServer && fs.existsSync(serverPath)) {
      fs.rmSync(serverPath, { recursive: true, force: true });
      console.log(`[Cleanup] Servidor eliminado: ${serverPath}`);
    } else if (!options.deleteServer && fs.existsSync(serverPath)) {
      console.log(`[Cleanup] Servidor preservado: ${serverPath}`);
    }
    
    console.log('[Cleanup] Limpieza completada');
    return { success: true, message: 'Datos eliminados exitosamente' };
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return { success: false, error: error.message };
  }
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
