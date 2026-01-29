import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import { AuthenticationManager } from '../shared/utils/AuthenticationManager';
import { SecureStorageManager } from '../shared/utils/SecureStorageManager';
import { I18nManager, Language } from '../shared/i18n/I18nManager';
import { ServerManager } from '../shared/services/ServerManager';
import { DownloadManager } from '../shared/services/DownloadManager';
import { FileManager } from '../shared/services/FileManager';
import { BackupManager } from '../shared/services/BackupManager';
import { ConfigManager } from '../shared/services/ConfigManager';
import { DiscordManager } from '../shared/services/DiscordManager';
import RemoteAccessManager from '../shared/services/RemoteAccessManager';
import { PermissionsManager } from '../shared/services/PermissionsManager';
import { RemoteSocketServer } from './RemoteSocketServer';

// Properly check if running in development
const isDevMode = (isDev as any) === true || (isDev as any).default === true;

// Desabilitar GPU si hay problemas en ciertos sistemas
if (process.env.DISABLE_GPU === '1' || process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

let mainWindow: BrowserWindow | null = null;
let discordManager: DiscordManager | null = null;
let remoteAccessManager: RemoteAccessManager | null = null;
let remoteSocketServer: RemoteSocketServer | null = null;

/**
 * Crea la ventana principal de la aplicación
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../../resources/icons/icon.png'),
  });

  // CSP is configured via meta tag in index.html
  // This works for both dev (HTTP) and production (file://)

  if (isDevMode) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // En producción, la ruta relativa es correcta porque __dirname apunta a dist/main/
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Manejar errores de carga
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription);
    console.error('__dirname:', __dirname);
    console.error('isDevMode:', isDevMode);
    console.error('Expected path:', path.join(__dirname, '../renderer/index.html'));
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Inicializa la aplicación
 */
app.on('ready', () => {
  SecureStorageManager.initialize();
  const savedServerPath = SecureStorageManager.getServerPath();
  if (savedServerPath) {
    ServerManager.getInstance().setServerPath(savedServerPath);
  }
  
  // Inicializar Discord Manager
  const appDataPath = app.getPath('userData');
  discordManager = new DiscordManager(appDataPath);
  
  // Inicializar Remote Access Manager
  remoteAccessManager = RemoteAccessManager.initialize(appDataPath);
  
  // Inicializar Remote Socket Server con todos los handlers
  const remoteConfig = remoteAccessManager.getConnectionConfig();
  const serverPath = SecureStorageManager.getServerPath();
  remoteSocketServer = new RemoteSocketServer(
    remoteAccessManager,
    {
      serverManager: ServerManager.getInstance(),
      configManager: new ConfigManager(serverPath || ''),
      backupManager: BackupManager.getInstance(),
      fileManager: FileManager,
      discordManager: discordManager,
    },
    remoteConfig.port
  );
  
  // Si el acceso remoto está habilitado, iniciar el servidor
  if (remoteConfig.enabled) {
    remoteSocketServer.start().then(success => {
      if (success) {
        console.log('[Main] Remote Socket Server started successfully');
      } else {
        console.error('[Main] Failed to start Remote Socket Server');
      }
    });
  }
  
  createWindow();
  setupIPCListeners();
  setupServerStatusListener();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Configura los listeners de IPC para comunicación entre procesos
 */
function setupIPCListeners() {
  // IPC: Autenticación
  ipcMain.handle('auth:register', async (event, data: any) => {
    try {
      const { username, encryptedPassword, passwordHash } = data;
      
      // Guardar credenciales encriptadas
      SecureStorageManager.saveCredentials({
        username,
        encryptedPassword,
        passwordHash,
      });

      return { success: true, message: 'Account created successfully' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:create-account', async (event, username: string, email: string, password: string) => {
    try {
      const user = AuthenticationManager.createAccount(username, email, password);
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:login', async (event, username: string, password: string) => {
    try {
      const user = AuthenticationManager.login(username, password);
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:has-account', async () => {
    try {
      return SecureStorageManager.accountExists();
    } catch {
      return false;
    }
  });

  ipcMain.handle('auth:get-current-user', async () => {
    return AuthenticationManager.getCurrentUser();
  });

  ipcMain.handle('auth:logout', async () => {
    AuthenticationManager.logout();
    return { success: true };
  });

  // IPC: Idioma
  ipcMain.handle('language:get-current', async () => {
    return I18nManager.getCurrentLanguage();
  });

  ipcMain.handle('language:set', async (event, language: Language) => {
    I18nManager.setLanguage(language);
    SecureStorageManager.setLastLanguage(language);
    return { success: true };
  });

  ipcMain.handle('language:get-available', async () => {
    return I18nManager.getAvailableLanguages();
  });

  ipcMain.handle('language:get-last', async () => {
    return SecureStorageManager.getLastLanguage();
  });

  // IPC: Resources path
  ipcMain.handle('app:get-resource-path', async (event, resourcePath: string) => {
    if (isDevMode) {
      // En desarrollo, usar ruta directa desde la raíz del proyecto
      return path.join(__dirname, '../../resources', resourcePath);
    } else {
      // En producción, recursos están en resources/ junto a app.asar
      return path.join(process.resourcesPath, resourcePath);
    }
  });

  // IPC: Servidor
  ipcMain.handle('server:get-path', async () => {
    const serverPath = SecureStorageManager.getServerPath();
    if (serverPath) {
      ServerManager.getInstance().setServerPath(serverPath);
    }
    return serverPath;
  });

  ipcMain.handle('server:set-path', async (event, serverPath: string) => {
    SecureStorageManager.setServerPath(serverPath);
    ServerManager.getInstance().setServerPath(serverPath);
    return { success: true };
  });

  // IPC: Control de Servidor (Fase 1)
  ipcMain.handle('server:start', async () => {
    try {
      await ServerManager.getInstance().start();
      return { success: true, state: ServerManager.getInstance().getState() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('server:stop', async () => {
    try {
      await ServerManager.getInstance().stop();
      return { success: true, state: ServerManager.getInstance().getState() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('server:restart', async () => {
    try {
      await ServerManager.getInstance().restart();
      return { success: true, state: ServerManager.getInstance().getState() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('server:get-status', async () => {
    return ServerManager.getInstance().getState();
  });

  ipcMain.handle('server:get-logs', async () => {
    return ServerManager.getInstance().getLogs();
  });

  ipcMain.handle('server:clear-logs', async () => {
    ServerManager.getInstance().clearLogs();
    return { success: true };
  });

  ipcMain.handle('server:send-command', async (event, command: string) => {
    try {
      ServerManager.getInstance().sendCommand(command);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // IPC: Dialog
  ipcMain.handle('dialog:open-directory', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:open-files', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile', 'multiSelections'],
      });
      return result.filePaths;
    } catch (error: any) {
      return [];
    }
  });

  // IPC: Download Manager
  ipcMain.handle('download:setup-folder', async (event, serverPath: string) => {
    try {
      console.log('Setup folder IPC called with path:', serverPath);
      const result = await DownloadManager.setupServerFolder(serverPath);
      const state = DownloadManager.getState();
      console.log('Setup result:', result, 'State:', state);
      return { success: result, state, error: state.error };
    } catch (error: any) {
      console.error('Setup folder error:', error);
      const state = DownloadManager.getState();
      return { success: false, error: error.message || 'Unknown error', state };
    }
  });

  ipcMain.handle('download:check-version', async (event, serverPath: string) => {
    try {
      const version = await DownloadManager.checkServerVersion(serverPath);
      return { success: true, version, state: DownloadManager.getState() };
    } catch (error: any) {
      return { success: false, error: error.message, state: DownloadManager.getState() };
    }
  });

  ipcMain.handle('download:start', async (event, serverPath: string) => {
    try {
      DownloadManager.downloadServer(serverPath).catch((error) => {
        console.error('Download error:', error);
      });
      return { success: true, state: DownloadManager.getState() };
    } catch (error: any) {
      return { success: false, error: error.message, state: DownloadManager.getState() };
    }
  });

  ipcMain.handle('download:get-state', async () => {
    return DownloadManager.getState();
  });

  ipcMain.handle('download:reset', async () => {
    try {
      DownloadManager.resetDownloadState();
      SecureStorageManager.clearDownloadState();
      return { success: true, state: DownloadManager.getState() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download:save-state', async (event, state: any) => {
    try {
      SecureStorageManager.setDownloadState(state);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download:load-saved-state', async () => {
    try {
      const savedState = SecureStorageManager.getDownloadState();
      return { success: true, state: savedState };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('download:extract', async (event, serverPath: string) => {
    try {
      const result = await DownloadManager.extractServer(serverPath);
      return { success: result, state: DownloadManager.getState() };
    } catch (error: any) {
      return { success: false, error: error.message, state: DownloadManager.getState() };
    }
  });

  // IPC: File Manager
  ipcMain.handle('files:list', async (event, dirPath: string) => {
    try {
      const files = FileManager.listFiles(dirPath);
      return { success: true, files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:read', async (event, filePath: string) => {
    try {
      const content = FileManager.readFile(filePath);
      return { success: true, content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:write', async (event, filePath: string, content: string) => {
    try {
      const result = FileManager.writeFile(filePath, content);
      return { success: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:delete', async (event, filePath: string) => {
    try {
      const result = FileManager.deleteFile(filePath);
      return { success: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:create-dir', async (event, dirPath: string) => {
    try {
      const result = FileManager.createDirectory(dirPath);
      return { success: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:rename', async (event, oldPath: string, newPath: string) => {
    try {
      const result = FileManager.renameFile(oldPath, newPath);
      return { success: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:info', async (event, filePath: string) => {
    try {
      const info = FileManager.getFileInfo(filePath);
      return { success: true, info };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:is-editable', async (event, filePath: string) => {
    try {
      const isEditable = FileManager.isEditableFile(filePath);
      return { success: true, isEditable };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:is-server-installed', async (event, dirPath: string) => {
    try {
      const isInstalled = FileManager.isServerInstalled(dirPath);
      return { success: true, isInstalled };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:upload', async (event, targetDir: string, filePaths: string[]) => {
    try {
      const result = FileManager.uploadFiles(targetDir, filePaths);
      return result;
    } catch (error: any) {
      return { success: false, uploaded: [], failed: [{ path: '', error: error.message }] };
    }
  });

  // IPC: Backups
  ipcMain.handle('backup:create', async (event, name?: string, fullBackup?: boolean) => {
    try {
      const serverPath = SecureStorageManager.getServerPath();
      if (!serverPath) {
        throw new Error('Server path not configured');
      }

      const backupManager = BackupManager.getInstance();
      backupManager.setPaths(serverPath);

      const backup = await backupManager.createBackup(name, fullBackup || false);
      return backup;
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('backup:list', async () => {
    try {
      const serverPath = SecureStorageManager.getServerPath();
      if (!serverPath) {
        return [];
      }

      const backupManager = BackupManager.getInstance();
      backupManager.setPaths(serverPath);

      const backups = await backupManager.listBackups();
      return backups;
    } catch (error: any) {
      console.error('Error listing backups:', error);
      return [];
    }
  });

  ipcMain.handle('backup:restore', async (event, backupId: string) => {
    try {
      const serverPath = SecureStorageManager.getServerPath();
      if (!serverPath) {
        throw new Error('Server path not configured');
      }

      const backupManager = BackupManager.getInstance();
      backupManager.setPaths(serverPath);

      await backupManager.restoreBackup(backupId);
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('backup:delete', async (event, backupId: string) => {
    try {
      const serverPath = SecureStorageManager.getServerPath();
      if (!serverPath) {
        throw new Error('Server path not configured');
      }

      const backupManager = BackupManager.getInstance();
      backupManager.setPaths(serverPath);

      await backupManager.deleteBackup(backupId);
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  // IPC: Configuration
  ipcMain.handle('config:read', async () => {
    try {
      const serverPath = SecureStorageManager.getServerPath();
      if (!serverPath) {
        throw new Error('Server path not configured');
      }

      const configManager = new ConfigManager(serverPath);
      const config = await configManager.readConfig();
      return config;
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('config:write', async (event, config: any) => {
    try {
      const serverPath = SecureStorageManager.getServerPath();
      if (!serverPath) {
        throw new Error('Server path not configured');
      }

      const configManager = new ConfigManager(serverPath);
      await configManager.writeConfig(config);
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('config:getSystemResources', async () => {
    try {
      const configManager = new ConfigManager(''); // No necesita la ruta del servidor
      const resources = configManager.getSystemResources();
      return resources;
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  // IPC: Discord Integration
  ipcMain.handle('discord:getConfig', async () => {
    try {
      if (!discordManager) {
        throw new Error('Discord manager not initialized');
      }
      return discordManager.getConfig();
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('discord:saveConfig', async (event, config: any) => {
    try {
      if (!discordManager) {
        throw new Error('Discord manager not initialized');
      }
      await discordManager.saveConfig(config);
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('discord:test', async () => {
    try {
      if (!discordManager) {
        throw new Error('Discord manager not initialized');
      }
      return await discordManager.testConnection();
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('discord:notify', async (event, isOnline: boolean) => {
    try {
      if (!discordManager) {
        throw new Error('Discord manager not initialized');
      }
      return await discordManager.notifyServerStatus(isOnline);
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  // IPC: Remote Access
  ipcMain.handle('remote:get-config', async () => {
    try {
      if (!remoteAccessManager) {
        throw new Error('Remote access manager not initialized');
      }
      return remoteAccessManager.getConnectionConfig();
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:set-enabled', async (event, enabled: boolean) => {
    try {
      if (!remoteAccessManager) {
        throw new Error('Remote access manager not initialized');
      }
      remoteAccessManager.setRemoteAccessEnabled(enabled);
      
      // Iniciar o detener el servidor Socket.io según el estado
      if (remoteSocketServer) {
        if (enabled && !remoteSocketServer.isServerRunning()) {
          const started = await remoteSocketServer.start();
          if (!started) {
            throw new Error('Failed to start remote socket server');
          }
          console.log('[Main] Remote Socket Server started');
        } else if (!enabled && remoteSocketServer.isServerRunning()) {
          await remoteSocketServer.stop();
          console.log('[Main] Remote Socket Server stopped');
        }
      }
      
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:get-users', async () => {
    try {
      if (!remoteAccessManager) {
        throw new Error('Remote access manager not initialized');
      }
      return remoteAccessManager.getRemoteUsers();
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:create-user', async (event, data: any) => {
    try {
      if (!remoteAccessManager) {
        throw new Error('Remote access manager not initialized');
      }
      const { username, password, email, permissions } = data;
      return await remoteAccessManager.createRemoteUser(username, password, permissions, email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:delete-user', async (event, userId: string) => {
    try {
      if (!remoteAccessManager) {
        throw new Error('Remote access manager not initialized');
      }
      remoteAccessManager.deleteRemoteUser(userId);
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:get-permissions', async () => {
    try {
      const permissionsManager = PermissionsManager.getInstance();
      return permissionsManager.getAllPermissions();
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:get-preset-permissions', async (event, role: string) => {
    try {
      const permissionsManager = PermissionsManager.getInstance();
      return permissionsManager.getPresetPermissions(role as any);
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:set-connection-methods', async (event, config: any) => {
    try {
      if (!remoteAccessManager) {
        throw new Error('Remote access manager not initialized');
      }
      remoteAccessManager.setConnectionMethods(config);
      
      // Si cambió el puerto y el servidor está corriendo, reiniciarlo
      if (remoteSocketServer && config.port && config.port !== remoteSocketServer.getPort()) {
        const wasRunning = remoteSocketServer.isServerRunning();
        
        if (wasRunning) {
          await remoteSocketServer.stop();
        }
        
        remoteSocketServer.setPort(config.port);
        
        if (wasRunning) {
          const started = await remoteSocketServer.start();
          if (!started) {
            console.error('[Main] Failed to restart remote socket server on new port');
          } else {
            console.log(`[Main] Remote Socket Server restarted on port ${config.port}`);
          }
        }
      }
      
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:login', async (event, username: string, password: string) => {
    try {
      if (!remoteAccessManager) {
        throw new Error('Remote access manager not initialized');
      }
      const token = await remoteAccessManager.authenticateRemoteUser(username, password);
      const jwt = remoteAccessManager.createJWT(await remoteAccessManager.getRemoteUser(token.userId) as any);
      return { success: true, token: jwt, userData: token };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  // Nuevos handlers para Socket.io Server
  ipcMain.handle('remote:get-server-status', async () => {
    try {
      if (!remoteSocketServer) {
        return { 
          running: false, 
          clients: 0, 
          port: 9999,
          connectedClients: []
        };
      }
      
      return {
        running: remoteSocketServer.isServerRunning(),
        clients: remoteSocketServer.getConnectedClientsCount(),
        port: remoteSocketServer.getPort(),
        connectedClients: remoteSocketServer.getConnectedClients(),
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('remote:broadcast-event', async (event, eventName: string, data: any) => {
    try {
      if (!remoteSocketServer || !remoteSocketServer.isServerRunning()) {
        throw new Error('Remote socket server not running');
      }
      
      remoteSocketServer.broadcastEvent(eventName, data);
      return { success: true };
    } catch (error: any) {
      throw new Error(error.message);
    }
  });
}

/**
 * Configura listeners de cambios de estado del servidor
 * Notifica al frontend cuando hay actualizaciones
 */
function setupServerStatusListener() {
  const serverManager = ServerManager.getInstance();
  const backupManager = BackupManager.getInstance();
  let lastLogCount = 0;

  // Escuchar cambios de estado del servidor
  serverManager.onStatusChange((state) => {
    if (mainWindow) {
      mainWindow.webContents.send('server:status-changed', state);
    }
    
    // Notificar a Discord cuando el estado cambia
    if (discordManager) {
      const isOnline = state.status === 'running';
      discordManager.notifyServerStatus(isOnline).catch((error) => {
        console.error('Error notificando a Discord:', error);
      });
    }
  });

  // Escuchar cambios de estado de backups
  backupManager.onStatusChange((message) => {
    if (mainWindow) {
      mainWindow.webContents.send('backup:status', message);
    }
  });

  // Polling para detectar nuevos logs y notificar al frontend
  setInterval(() => {
    const logs = serverManager.getLogs();
    if (logs.length !== lastLogCount) {
      lastLogCount = logs.length;
      if (mainWindow) {
        mainWindow.webContents.send('server:logs-updated', logs);
      }
    }
  }, 250); // Enviar eventos cada 250ms si hay cambios
}
