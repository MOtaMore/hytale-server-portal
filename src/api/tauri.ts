/**
 * Tauri API Adapter
 * This file replaces the Electron IPC API with Tauri's invoke API
 */

import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';

type Unlisten = () => void;

const eventListeners: Record<string, Set<Unlisten>> = {};

const addListener = (event: string, unlisten: Unlisten) => {
  if (!eventListeners[event]) {
    eventListeners[event] = new Set();
  }
  eventListeners[event].add(unlisten);
};

const removeListener = (event: string, unlisten?: Unlisten) => {
  if (!eventListeners[event]) return;
  if (unlisten) {
    eventListeners[event].delete(unlisten);
  } else {
    eventListeners[event].forEach((fn) => fn());
    eventListeners[event].clear();
  }
};

const onEvent = (event: string, callback: (payload: any) => void) => {
  let disposed = false;
  let unlisten: Unlisten | null = null;

  listen(event, (evt) => callback(evt.payload))
    .then((fn) => {
      if (disposed) {
        fn();
        return;
      }
      unlisten = fn;
      addListener(event, fn);
    })
    .catch((err) => {
      console.warn(`Failed to listen for event ${event}:`, err);
    });

  const off = () => {
    disposed = true;
    if (unlisten) {
      unlisten();
      removeListener(event, unlisten);
    }
  };

  return off;
};

// Auth API
export const authAPI = {
  register: (params: { username: string; password?: string; encryptedPassword?: string; passwordHash?: string; email?: string }) =>
    invoke<{ success: boolean; user?: any; message?: string; token?: string }>('register', { 
      username: params.username,
      email: params.email || `${params.username}@local`,
      // IMPORTANT: Use plain password first, backend will hash it properly
      password: params.password || params.encryptedPassword || params.passwordHash || '' 
    }),
  
  createAccount: (username: string, email: string, password: string) =>
    invoke<{ success: boolean; user?: any; message?: string; error?: string; token?: string }>('register', { username, email, password }),
  
  login: (params: { username: string; password: string }) =>
    invoke<{ success: boolean; user?: any; message?: string; error?: string; token?: string }>('login', params),
  
  logout: () =>
    invoke<{ success: boolean }>('logout'),
  
  hasAccount: () =>
    invoke<boolean>('has_account'),
  
  getCurrentUser: () =>
    invoke<any>('get_current_user'),
};

// Server API
export const serverAPI = {
  getPath: () =>
    invoke<string | null>('get_path'),
  
  setPath: (path: string) =>
    invoke<boolean>('set_path', { path }),
  
  start: async () => {
    const success = await invoke<boolean>('start');
    const state = await invoke<{ running: boolean; pid?: number }>('get_status');
    return { success, state: { status: state.running ? 'running' : 'stopped' }, error: null };
  },
  
  stop: async () => {
    const success = await invoke<boolean>('stop');
    const state = await invoke<{ running: boolean; pid?: number }>('get_status');
    return { success, state: { status: state.running ? 'running' : 'stopped' }, error: null };
  },
  
  restart: async () => {
    const success = await invoke<boolean>('restart');
    const state = await invoke<{ running: boolean; pid?: number }>('get_status');
    return { success, state: { status: state.running ? 'running' : 'stopped' }, error: null };
  },
  
  getStatus: async () => {
    const result = await invoke<{ running: boolean; pid?: number }>('get_status');
    return { status: result.running ? 'running' : 'stopped', pid: result.pid };
  },
  
  getLogs: () =>
    invoke<string[]>('get_logs'),
  
  sendCommand: async (command: string) => {
    const success = await invoke<boolean>('send_server_command', { command });
    return { success };
  },
    
  // Event stubs for compatibility (Tauri uses different event system)
  on: (event: string, callback: any) => onEvent(event, callback),
  
  off: (event: string) => removeListener(event),
};

// File API
export const fileAPI = {
  list: async (path: string) => {
    try {
      const rawFiles = await invoke<Array<{ name: string; path: string; is_dir: boolean; size: number }>>('list_files', { dirPath: path });
      // Map to expected format
      const files = rawFiles.map((f: any) => ({
        name: f.name,
        path: f.path,
        isDirectory: f.is_dir,
        size: f.size,
        modified: new Date(),
        extension: f.name.includes('.') ? f.name.split('.').pop() : undefined,
      }));
      return { success: true, files };
    } catch (error) {
      return { success: false, error: String(error), files: [] };
    }
  },
  
  read: async (path: string) => {
    try {
      const content = await invoke<string>('read_file', { filePath: path });
      return { success: true, content };
    } catch (error) {
      return { success: false, error: String(error), content: '' };
    }
  },
  
  write: async (path: string, content: string) => {
    try {
      await invoke<boolean>('write_file', { filePath: path, content });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  
  delete: async (path: string) => {
    try {
      await invoke<boolean>('delete_file', { filePath: path });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  
  createDir: (path: string) =>
    invoke<boolean>('create_dir', { dirPath: path }),
    
  isEditable: (path: string) => {
    // Heuristic: check file extension
    const ext = path.split('.').pop()?.toLowerCase();
    const editableExts = ['txt', 'json', 'yaml', 'yml', 'toml', 'xml', 'properties', 'cfg', 'conf', 'ini', 'sh', 'bat', 'md', 'log'];
    return Promise.resolve({ success: true, isEditable: editableExts.includes(ext || '') });
  },
  
  readBinary: async (path: string) => {
    try {
      // For now, read as text and convert to base64
      const content = await invoke<string>('read_file', { path });
      const base64 = btoa(content);
      return { success: true, data: new TextEncoder().encode(content), base64 };
    } catch (error) {
      return { success: false, error: String(error), data: new Uint8Array(), base64: '' };
    }
  },
  
  upload: async (dirPath: string, filePaths: string[]) => {
    try {
      let uploaded = 0;
      let failed = 0;
      
      for (const filePath of filePaths) {
        try {
          const fileName = filePath.split(/[\/\\]/).pop() || 'unknown';
          const destPath = `${dirPath}/${fileName}`;
          
          // Read file content
          const content = await invoke<string>('read_file', { filePath });
          // Write to destination
          await invoke<boolean>('write_file', { filePath: destPath, content });
          
          uploaded++;
        } catch (err) {
          console.error('[UPLOAD] Failed to upload file:', filePath, err);
          failed++;
        }
      }
      
      return { success: uploaded > 0, uploaded, failed };
    } catch (error) {
      return { success: false, error: String(error), uploaded: 0, failed: filePaths.length };
    }
  },
  
  isServerInstalled: async (path: string) => {
    // Check if server files exist in the path
    try {
      console.log('[SERVER] Checking if server is installed at:', path);
      const files = await invoke<Array<any>>('list_files', { dirPath: path });
      console.log('[SERVER] Files found:', files?.length || 0);
      
      const serverFiles = ['hytale-server.jar', 'server.jar', 'start-server.sh', 'start-server.bat', 'hytale-downloader-linux-amd64'];
      const hasServerFiles = files?.some((f: any) => 
        serverFiles.includes(f.name)
      );
      
      console.log('[SERVER] Server installed:', hasServerFiles);
      return { installed: !!hasServerFiles };
    } catch (error) {
      console.error('[SERVER] Error checking installation:', error);
      return { installed: false };
    }
  },
};

// Config API
export const configAPI = {
  read: () =>
    invoke<any>('read_config'),
  
  write: (config: any) =>
    invoke<boolean>('write_config', { config }),
  
  getSystemResources: () =>
    invoke<{
      cpu: { count: number; brand: string };
      memory: { total: number; used: number; available: number };
    }>('get_system_resources')
      .then((result: any) => {
        console.log('[SYSTEM] Resources received:', result);
        return {
          cpuModel: result.cpu.brand,
          cpuCores: result.cpu.count,
          totalCPUs: result.cpu.count, // For compatibility with ConfigPanel
          totalMemory: result.memory.total, // Already in MB from backend
          totalRAM: result.memory.total, // For compatibility with ConfigPanel
          availableMemory: result.memory.available, // Already in MB from backend
        };
      })
      .catch((error) => {
        console.error('[SYSTEM] Failed to get resources:', error);
        return {
          cpuModel: 'Unknown CPU',
          cpuCores: 4,
          totalCPUs: 4,
          totalMemory: 8192,
          totalRAM: 8192,
          availableMemory: 4096,
        };
      }),
};

// Backup API
export const backupAPI = {
  create: (name?: string) =>
    invoke<{ id: string; name: string; created_at: string }>('create_backup', { name }),
  
  list: () =>
    invoke<Array<{ id: string; name: string; created_at: string }>>('list_backups'),
  
  restore: (backupId: string) =>
    invoke<boolean>('restore_backup', { backupId: backupId }),
  
  delete: (backupId: string) =>
    invoke<boolean>('delete_backup', { backupId: backupId }),
};

// Discord API
export const discordAPI = {
  getConfig: () =>
    invoke<any>('get_discord_config'),
  
  saveConfig: (config: any) =>
    invoke<boolean>('save_discord_config', { config }),
  
  test: () =>
    invoke<boolean>('test_webhook'),
  
  testWebhook: () =>
    invoke<boolean>('test_webhook'),
};

// Remote API
export const remoteAPI = {
  getConfig: () =>
    invoke<any>('get_remote_config').then(config => ({
      enabled: false,
      ipv4: '',
      ipv6: '',
      tunnelUrl: '',
      methods: ['ip', 'tunnel'],
      ...config,
    })),
  
  saveConfig: (config: any) =>
    invoke<boolean>('set_remote_config', { config }),
  
  setEnabled: (enabled: boolean) =>
    invoke<boolean>('set_remote_enabled', { enabled }),
  
  getUsers: () =>
    invoke<Array<{ id: string; username: string; permissions: string[] }>>('get_users').then(users => users || []),
  
  createUser: (username: string, password: string, permissions: string[]) =>
    invoke<{ id: string; username: string; permissions: string[] }>('create_user', { username, password, permissions }),
  
  deleteUser: (userId: string) =>
    invoke<boolean>('delete_user', { userId: userId }),
    
  getPermissions: () =>
    Promise.resolve([
      { id: 'server_start', name: 'server_start', description: '', category: 'server' },
      { id: 'server_stop', name: 'server_stop', description: '', category: 'server' },
      { id: 'server_restart', name: 'server_restart', description: '', category: 'server' },
      { id: 'server_view_status', name: 'server_view_status', description: '', category: 'server' },
      { id: 'server_view_logs', name: 'server_view_logs', description: '', category: 'server' },
      { id: 'config_read', name: 'config_read', description: '', category: 'config' },
      { id: 'config_write', name: 'config_write', description: '', category: 'config' },
      { id: 'backup_create', name: 'backup_create', description: '', category: 'backup' },
      { id: 'backup_restore', name: 'backup_restore', description: '', category: 'backup' },
      { id: 'backup_view', name: 'backup_view', description: '', category: 'backup' },
      { id: 'backup_delete', name: 'backup_delete', description: '', category: 'backup' },
      { id: 'files_upload', name: 'files_upload', description: '', category: 'files' },
      { id: 'files_download', name: 'files_download', description: '', category: 'files' },
      { id: 'files_delete', name: 'files_delete', description: '', category: 'files' },
      { id: 'files_view', name: 'files_view', description: '', category: 'files' },
      { id: 'discord_send_messages', name: 'discord_send_messages', description: '', category: 'discord' },
      { id: 'discord_configure', name: 'discord_configure', description: '', category: 'discord' },
      { id: 'discord_view', name: 'discord_view', description: '', category: 'discord' },
      { id: 'discord_manage_webhooks', name: 'discord_manage_webhooks', description: '', category: 'discord' },
      { id: 'discord_view_notifications', name: 'discord_view_notifications', description: '', category: 'discord' },
    ]),
    
  getServerStatus: async () => {
    try {
      const config = await invoke<any>('get_remote_config');
      return { 
        running: config?.enabled || false, 
        status: config?.enabled ? 'running' : 'stopped', 
        clients: 0, 
        port: config?.port || 9999 
      };
    } catch (e) {
      return { running: false, status: 'stopped', clients: 0, port: 9999 };
    }
  },
};

// App API
export const appAPI = {
  getResourcePath: (relativePath: string) => {
    // In Tauri, resources are bundled differently
    return Promise.resolve(`/resources/${relativePath}`);
  },
};

// Download API (stubs for server download functionality)
export const downloadAPI = {
  loadSavedState: () => Promise.resolve(null),
  saveState: (state: any) => Promise.resolve(),
  getState: () => Promise.resolve({ status: 'idle' }),
  setupFolder: (path: string) => Promise.resolve({ success: true }),
  start: async (path: string, url?: string) => {
    try {
      if (!url) {
        // Default Hytale server URL (replace with actual URL when available)
        url = 'https://example.com/hytale-server.zip';
      }
      const result = await invoke<string>('download_server', { url, destination: path });
      return { success: true, path: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  cancel: () => Promise.resolve({ success: true }),
  pause: () => Promise.resolve({ success: true }),
  resume: () => Promise.resolve({ success: true }),
};

// Compatibility layer for existing code
export const tauriAPI = {
  auth: authAPI,
  server: {
    ...serverAPI,
    clearLogs: () => invoke<boolean>('clear_logs'),
  },
  files: fileAPI,
  file: fileAPI, // Alias
  config: configAPI,
  backup: backupAPI,
  discord: discordAPI,
  remote: remoteAPI,
  app: appAPI,
  download: downloadAPI,
  dialog: {
    openDirectory: async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({ directory: true, multiple: false });
      
      // Return Electron-compatible format
      if (result) {
        console.log('[DIALOG] Selected directory:', result);
        return {
          canceled: false,
          filePaths: [result]
        };
      } else {
        console.log('[DIALOG] Directory selection canceled');
        return {
          canceled: true,
          filePaths: []
        };
      }
    },
    openFiles: async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({ directory: false, multiple: true });
      
      // Return Electron-compatible format
      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        console.log('[DIALOG] Selected files:', paths);
        return {
          canceled: false,
          filePaths: paths
        };
      } else {
        return {
          canceled: true,
          filePaths: []
        };
      }
    },
  },
  // Global event handlers
  on: (event: string, callback: any) => onEvent(event, callback),
  off: (event: string) => removeListener(event),
  emit: (event: string, payload?: any) => emit(event, payload),
  // Direct invoke for advanced usage
  invoke: async (command: string, ...args: any[]) => {
    // Map old IPC commands to new Tauri commands
    const commandMap: Record<string, string> = {
      'remote:get-config': 'get_remote_config',
      'remote:set-enabled': 'set_remote_enabled',
      'remote:list-users': 'get_users',
      'remote:get-users': 'get_users',
      'remote:create-user': 'create_user',
      'remote:delete-user': 'delete_user',
      'remote:get-status': 'get_status',
      'remote:get-preset-permissions': 'get_users', // Stub
    };
    
    const tauriCommand = commandMap[command];
    if (tauriCommand) {
      // Special handling for remote config to ensure proper defaults
      if (command === 'remote:get-config') {
        try {
          const config = await invoke(tauriCommand, ...(args.length > 0 ? [args[0]] : []));
          return {
            enabled: false,
            ipv4: '',
            ipv6: '',
            tunnelUrl: '',
            methods: ['ip', 'tunnel'],
            ...(config && typeof config === 'object' ? config : {}),
          };
        } catch {
          return {
            enabled: false,
            ipv4: '',
            ipv6: '',
            tunnelUrl: '',
            methods: ['ip', 'tunnel'],
          };
        }
      }
      if (command === 'remote:list-users' || command === 'remote:get-users') {
        const users = await invoke(tauriCommand, ...(args.length > 0 ? [args[0]] : []));
        return users || [];
      }
      if (command === 'remote:get-preset-permissions') {
        // Return preset permissions based on role
        return [];
      }
      return invoke(tauriCommand, ...(args.length > 0 ? [args[0]] : []));
    }
    
    console.warn(`Direct invoke not mapped: ${command}`, args);
    return Promise.resolve(null);
  },
  // Language/i18n stub
  language: {
    get: () => 'en',
    set: (lang: string) => {},
    getLast: () => 'en',
  },
};

// Export as default for easier migration
export default tauriAPI;
