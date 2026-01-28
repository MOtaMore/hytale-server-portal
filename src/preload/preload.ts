import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - expone APIs seguras al renderer process
 */
contextBridge.exposeInMainWorld('electron', {
  // Autenticación
  auth: {
    register: (data: any) => ipcRenderer.invoke('auth:register', data),
    createAccount: (username: string, email: string, password: string) =>
      ipcRenderer.invoke('auth:create-account', username, email, password),
    login: (credentials: { username: string; password: string }) =>
      ipcRenderer.invoke('auth:login', credentials.username, credentials.password),
    hasAccount: () => ipcRenderer.invoke('auth:has-account'),
    getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
    logout: () => ipcRenderer.invoke('auth:logout'),
  },

  // Idioma
  language: {
    getCurrent: () => ipcRenderer.invoke('language:get-current'),
    set: (language: string) => ipcRenderer.invoke('language:set', language),
    getAvailable: () => ipcRenderer.invoke('language:get-available'),
    getLast: () => ipcRenderer.invoke('language:get-last'),
  },

  // Servidor
  server: {
    getPath: () => ipcRenderer.invoke('server:get-path'),
    setPath: (serverPath: string) => ipcRenderer.invoke('server:set-path', serverPath),
    start: () => ipcRenderer.invoke('server:start'),
    stop: () => ipcRenderer.invoke('server:stop'),
    restart: () => ipcRenderer.invoke('server:restart'),
    getStatus: () => ipcRenderer.invoke('server:get-status'),
    getLogs: () => ipcRenderer.invoke('server:get-logs'),
    clearLogs: () => ipcRenderer.invoke('server:clear-logs'),
    sendCommand: (command: string) => ipcRenderer.invoke('server:send-command', command),
  },

  // Descarga
  download: {
    setupFolder: (serverPath: string) => ipcRenderer.invoke('download:setup-folder', serverPath),
    checkVersion: (serverPath: string) => ipcRenderer.invoke('download:check-version', serverPath),
    start: (serverPath: string) => ipcRenderer.invoke('download:start', serverPath),
    getState: () => ipcRenderer.invoke('download:get-state'),
    reset: () => ipcRenderer.invoke('download:reset'),
    saveState: (state: any) => ipcRenderer.invoke('download:save-state', state),
    loadSavedState: () => ipcRenderer.invoke('download:load-saved-state'),
    extract: (serverPath: string) => ipcRenderer.invoke('download:extract', serverPath),
  },

  // Dialog
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
  },

  // File Manager
  files: {
    list: (dirPath: string) => ipcRenderer.invoke('files:list', dirPath),
    read: (filePath: string) => ipcRenderer.invoke('files:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('files:write', filePath, content),
    delete: (filePath: string) => ipcRenderer.invoke('files:delete', filePath),
    createDir: (dirPath: string) => ipcRenderer.invoke('files:create-dir', dirPath),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('files:rename', oldPath, newPath),
    info: (filePath: string) => ipcRenderer.invoke('files:info', filePath),
    isEditable: (filePath: string) => ipcRenderer.invoke('files:is-editable', filePath),
    isServerInstalled: (dirPath: string) => ipcRenderer.invoke('files:is-server-installed', dirPath),
    upload: (targetDir: string, filePaths: string[]) => ipcRenderer.invoke('files:upload', targetDir, filePaths),
  },

  // Backup Manager
  backup: {
    create: (name?: string, fullBackup?: boolean) => ipcRenderer.invoke('backup:create', name, fullBackup),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (backupId: string) => ipcRenderer.invoke('backup:restore', backupId),
    delete: (backupId: string) => ipcRenderer.invoke('backup:delete', backupId),
  },

  // Configuración
  config: {
    read: () => ipcRenderer.invoke('config:read'),
    write: (config: any) => ipcRenderer.invoke('config:write', config),
    getSystemResources: () => ipcRenderer.invoke('config:getSystemResources'),
  },

  // Discord Integration
  discord: {
    getConfig: () => ipcRenderer.invoke('discord:getConfig'),
    saveConfig: (config: any) => ipcRenderer.invoke('discord:saveConfig', config),
    test: () => ipcRenderer.invoke('discord:test'),
    notify: (isOnline: boolean) => ipcRenderer.invoke('discord:notify', isOnline),
  },

  // Helper to invoke any IPC channel
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  // Event listeners
  on: (channel: string, callback: (data: any) => void) => {
    ipcRenderer.on(channel, (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners(channel);
  },
  off: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

declare global {
  interface Window {
    electron: {
      auth: {
        register: (data: any) => Promise<any>;
        createAccount: (username: string, email: string, password: string) => Promise<any>;
        login: (credentials: { username: string; password: string }) => Promise<any>;
        hasAccount: () => Promise<boolean>;
        getCurrentUser: () => Promise<any>;
        logout: () => Promise<any>;
      };
      language: {
        getCurrent: () => Promise<string>;
        set: (language: string) => Promise<any>;
        getAvailable: () => Promise<Array<{ code: string; name: string }>>;
        getLast: () => Promise<string>;
      };
      server: {
        getPath: () => Promise<string | null>;
        setPath: (serverPath: string) => Promise<any>;
        start: () => Promise<any>;
        stop: () => Promise<any>;
        restart: () => Promise<any>;
        getStatus: () => Promise<any>;
        getLogs: () => Promise<string[]>;
        clearLogs: () => Promise<any>;
        sendCommand: (command: string) => Promise<any>;
      };
      download: {
        setupFolder: (serverPath: string) => Promise<any>;
        checkVersion: (serverPath: string) => Promise<any>;
        start: (serverPath: string) => Promise<any>;
        getState: () => Promise<any>;
        reset: () => Promise<any>;
        saveState: (state: any) => Promise<any>;
        loadSavedState: () => Promise<any>;
        extract: (serverPath: string) => Promise<any>;
      };
      dialog: {
        openDirectory: () => Promise<any>;
      };
      files: {
        list: (dirPath: string) => Promise<any>;
        read: (filePath: string) => Promise<any>;
        write: (filePath: string, content: string) => Promise<any>;
        delete: (filePath: string) => Promise<any>;
        createDir: (dirPath: string) => Promise<any>;
        rename: (oldPath: string, newPath: string) => Promise<any>;
        info: (filePath: string) => Promise<any>;
        isEditable: (filePath: string) => Promise<any>;
        isServerInstalled: (dirPath: string) => Promise<any>;
        upload: (targetDir: string, filePaths: string[]) => Promise<any>;
      };
      backup: {
        create: (name?: string) => Promise<any>;
        list: () => Promise<any[]>;
        restore: (backupId: string) => Promise<any>;
        delete: (backupId: string) => Promise<any>;
      };
      config: {
        read: () => Promise<any>;
        write: (config: any) => Promise<any>;
        getSystemResources: () => Promise<any>;
      };
      discord: {
        getConfig: () => Promise<any>;
        saveConfig: (config: any) => Promise<any>;
        test: () => Promise<any>;
        notify: (isOnline: boolean) => Promise<any>;
      };
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (data: any) => void) => () => void;
      off: (channel: string) => void;
    };
  }
}
