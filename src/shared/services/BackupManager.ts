import * as fs from 'fs';
import * as path from 'path';
import { spawn, execSync } from 'child_process';
import AdmZip from 'adm-zip';

export interface Backup {
  id: string;
  name: string;
  date: Date;
  size: number;
  path: string;
}

/**
 * Gestor de backups del servidor
 * Permite crear, restaurar y eliminar backups
 */
export class BackupManager {
  private static instance: BackupManager;
  private backupPath: string | null = null;
  private serverPath: string | null = null;
  private statusListeners: Set<(message: string) => void> = new Set();

  private constructor() {}

  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * Configura las rutas necesarias
   */
  setPaths(serverPath: string, backupPath?: string): void {
    this.serverPath = serverPath;
    this.backupPath = backupPath || path.join(serverPath, '..', 'backups');

    // Crear carpeta de backups si no existe
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
  }

  /**
   * Suscribirse a notificaciones de estado
   */
  onStatusChange(listener: (message: string) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyListeners(message: string): void {
    this.statusListeners.forEach((listener) => listener(message));
  }

  /**
   * Crea un nuevo backup del servidor
   * @param name - Nombre del backup (opcional)
   * @param fullBackup - Si true, respalda TODO el servidor. Si false, solo archivos selectivos
   */
  async createBackup(name?: string, fullBackup: boolean = false): Promise<Backup> {
    if (!this.serverPath || !this.backupPath) {
      throw new Error('Paths not configured');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupType = fullBackup ? 'full' : 'selective';
    const backupName = name || `backup-${timestamp}-${backupType}-${Date.now()}`;
    const backupFile = path.join(this.backupPath, `${backupName}.zip`);

    this.notifyListeners(`Creating ${backupType} backup...`);

    return new Promise((resolve, reject) => {
      try {
        // Usar AdmZip para crear el backup
        const zip = new AdmZip();
        
        if (fullBackup) {
          // Backup completo - respaldar TODO excepto archivos excluidos
          const excludePatterns = [
            'start-server.sh',
            'start-server.bat',
            'stop-server.sh',
            'stop-server.bat',
            'StartServer.sh',
            'StartServer.bat',
            'hytale-downloader-linux-amd64',
            'hytale-downloader-windows-amd64.exe',
            '.download-status.json',
            '.hytale-downloader-credentials.json',
            'backups', // No incluir la carpeta de backups
          ];

          const addFilesRecursive = (dir: string, baseDir: string = '') => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;

              // Saltar archivos excluidos
              if (excludePatterns.includes(entry.name)) {
                this.notifyListeners(`Skipping: ${entry.name}`);
                continue;
              }

              if (entry.isDirectory()) {
                addFilesRecursive(fullPath, relativePath);
              } else {
                zip.addLocalFile(fullPath, baseDir);
                this.notifyListeners(`Adding: ${relativePath}`);
              }
            }
          };

          addFilesRecursive(this.serverPath!);
        } else {
          // Backup selectivo - solo archivos importantes
          const itemsToBackup = [
            'worlds',
            'mods',
            'server-config.json',
            'server.properties',
            'whitelist.json',
            'ops.json',
            'banned-players.json',
            'banned-ips.json',
          ];

          itemsToBackup.forEach((item) => {
            const itemPath = path.join(this.serverPath!, item);
            if (fs.existsSync(itemPath)) {
              const stat = fs.statSync(itemPath);
              if (stat.isDirectory()) {
                zip.addLocalFolder(itemPath, item);
                this.notifyListeners(`Adding folder: ${item}`);
              } else {
                zip.addLocalFile(itemPath);
                this.notifyListeners(`Adding file: ${item}`);
              }
            }
          });
        }

        // Escribir el archivo zip
        zip.writeZip(backupFile);

        const stat = fs.statSync(backupFile);
        const backup: Backup = {
          id: backupName,
          name: backupName,
          date: new Date(),
          size: stat.size,
          path: backupFile,
        };

        this.notifyListeners('Backup created successfully');
        resolve(backup);
      } catch (error: any) {
        this.notifyListeners(`Error creating backup: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Lista todos los backups disponibles
   */
  async listBackups(): Promise<Backup[]> {
    if (!this.backupPath) {
      throw new Error('Backup path not configured');
    }

    if (!fs.existsSync(this.backupPath)) {
      return [];
    }

    const files = fs.readdirSync(this.backupPath);
    const backups: Backup[] = [];

    for (const file of files) {
      if (!file.endsWith('.zip')) continue;

      const filePath = path.join(this.backupPath, file);
      const stat = fs.statSync(filePath);

      backups.push({
        id: file.replace('.zip', ''),
        name: file.replace('.zip', ''),
        date: stat.mtime,
        size: stat.size,
        path: filePath,
      });
    }

    // Ordenar por fecha (más reciente primero)
    backups.sort((a, b) => b.date.getTime() - a.date.getTime());

    return backups;
  }

  /**
   * Restaura un backup
   */
  async restoreBackup(backupId: string): Promise<void> {
    if (!this.serverPath || !this.backupPath) {
      throw new Error('Paths not configured');
    }

    const backupFile = path.join(this.backupPath, `${backupId}.zip`);

    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup not found');
    }

    this.notifyListeners('Restoring backup...');

    return new Promise((resolve, reject) => {
      try {
        const zip = new AdmZip(backupFile);

        // Extraer todos los archivos
        zip.extractAllTo(this.serverPath!, true);

        this.notifyListeners('Backup restored successfully');
        resolve();
      } catch (error: any) {
        this.notifyListeners(`Error restoring backup: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Elimina un backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    if (!this.backupPath) {
      throw new Error('Backup path not configured');
    }

    const backupFile = path.join(this.backupPath, `${backupId}.zip`);

    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup not found');
    }

    fs.unlinkSync(backupFile);
    this.notifyListeners('Backup deleted successfully');
  }

  /**
   * Obtiene información de un backup específico
   */
  async getBackupInfo(backupId: string): Promise<Backup | null> {
    const backups = await this.listBackups();
    return backups.find((b) => b.id === backupId) || null;
  }

  /**
   * Formatea el tamaño en bytes a una cadena legible
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
