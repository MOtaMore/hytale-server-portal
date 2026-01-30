/**
 * Tauri Global Shim
 * This makes Tauri API available as window.electron for backward compatibility
 */

import tauriAPI from './tauri';

// Extend the Window interface
declare global {
  interface Window {
    electron: typeof tauriAPI;
  }
}

// Make Tauri API available as window.electron
if (typeof window !== 'undefined') {
  window.electron = tauriAPI;
}

export {};
