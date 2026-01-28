import { EncryptionManager } from './EncryptionManager';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface UserAccount {
  username: string;
  passwordHash: string;
  email: string;
  createdAt: string;
}

export interface StorageData {
  user?: UserAccount;
  serverPath?: string;
  lastLanguage?: string;
  downloadState?: {
    status: string;
    progress: number;
    message: string;
    serverPath?: string;
    serverVersion?: string;
    error?: string;
    deviceCodeUrl?: string;
    deviceCode?: string;
  };
}

/**
 * Gestor de almacenamiento seguro de datos en el sistema de archivos
 */
export class SecureStorageManager {
  private static readonly STORAGE_DIR = path.join(app.getPath('userData'), 'secure-storage');
  private static readonly STORAGE_FILE = path.join(this.STORAGE_DIR, 'data.json');

  /**
   * Inicializa el directorio de almacenamiento
   */
  static initialize(): void {
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Guarda datos encriptados
   */
  static save(data: StorageData): void {
    this.initialize();
    const encrypted = EncryptionManager.encrypt(JSON.stringify(data));
    fs.writeFileSync(this.STORAGE_FILE, encrypted, 'utf8');
  }

  /**
   * Carga datos desencriptados
   */
  static load(): StorageData {
    this.initialize();
    
    if (!fs.existsSync(this.STORAGE_FILE)) {
      return {};
    }

    try {
      const encrypted = fs.readFileSync(this.STORAGE_FILE, 'utf8');
      const decrypted = EncryptionManager.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error loading secure storage:', error);
      return {};
    }
  }

  /**
   * Obtiene el usuario guardado
   */
  static getUser(): UserAccount | null {
    const data = this.load();
    return data.user || null;
  }

  /**
   * Verifica si existe una cuenta sin limpiarla
   */
  static accountExists(): boolean {
    const data = this.load();
    return !!data.user;
  }

  /**
   * Guarda un usuario
   */
  static saveUser(user: UserAccount): void {
    const data = this.load();
    data.user = user;
    this.save(data);
  }

  /**
   * Elimina el usuario (logout)
   */
  static clearUser(): void {
    const data = this.load();
    delete data.user;
    this.save(data);
  }

  /**
   * Obtiene la ruta del servidor
   */
  static getServerPath(): string | null {
    const data = this.load();
    return data.serverPath || null;
  }

  /**
   * Guarda la ruta del servidor
   */
  static setServerPath(serverPath: string): void {
    const data = this.load();
    data.serverPath = serverPath;
    this.save(data);
  }

  /**
   * Obtiene el último idioma seleccionado
   */
  static getLastLanguage(): string {
    const data = this.load();
    return data.lastLanguage || 'es';
  }

  /**
   * Guarda el último idioma seleccionado
   */
  static setLastLanguage(language: string): void {
    const data = this.load();
    data.lastLanguage = language;
    this.save(data);
  }

  /**
   * Guarda las credenciales encriptadas del usuario local
   */
  static saveCredentials(credentials: { username: string; encryptedPassword: string; passwordHash: string }): void {
    const data = this.load();
    data.user = {
      username: credentials.username,
      passwordHash: credentials.passwordHash,
      email: '',
      createdAt: new Date().toISOString(),
    };
    this.save(data);
  }

  /**
   * Limpia todo el almacenamiento
   */
  static clear(): void {
    if (fs.existsSync(this.STORAGE_FILE)) {
      fs.unlinkSync(this.STORAGE_FILE);
    }
  }

  /**
   * Obtiene el estado de descarga guardado
   */
  static getDownloadState(): any | null {
    const data = this.load();
    return data.downloadState || null;
  }

  /**
   * Guarda el estado de descarga
   */
  static setDownloadState(downloadState: any): void {
    const data = this.load();
    data.downloadState = downloadState;
    this.save(data);
  }

  /**
   * Limpia el estado de descarga
   */
  static clearDownloadState(): void {
    const data = this.load();
    delete data.downloadState;
    this.save(data);
  }
}
