import { contextBridge, ipcRenderer } from 'electron';

// Safely expose APIs to the renderer context
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getUserDataPath: () => ipcRenderer.invoke('app:get-user-data-path'),
  getAppPath: () => ipcRenderer.invoke('app:get-app-path'),
  
  // App control
  quit: () => ipcRenderer.invoke('app:quit'),
  
  // Utility
  isElectron: true,
  platform: process.platform
});
