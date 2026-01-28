import * as fs from 'fs';
import * as path from 'path';

// Archivos protegidos que no deben ser visibles ni editables
const PROTECTED_FILES = [
  'start-server.bat',
  'start-server.sh',
  'stop-server.bat',
  'stop-server.sh',
  'hytale-downloader-linux-amd64',
  'hytale-downloader-windows-amd64.exe',
];

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  extension?: string;
  isProtected?: boolean;
}

export interface FileContent {
  content: string;
  encoding: string;
}

/**
 * Gestor de archivos del servidor Hytale
 * Permite listar, leer, escribir y eliminar archivos
 */
export class FileManager {
  /**
   * Verifica si un archivo está protegido
   */
  static isProtectedFile(fileName: string): boolean {
    return PROTECTED_FILES.some(
      (protectedName) =>
        fileName === protectedName || fileName.startsWith('hytale-downloader')
    );
  }

  /**
   * Lista archivos y directorios en una ruta
   */
  static listFiles(dirPath: string): FileInfo[] {
    try {
      if (!fs.existsSync(dirPath)) {
        throw new Error('Directory does not exist');
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        // Filtrar archivos protegidos
        if (this.isProtectedFile(entry.name)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const stats = fs.statSync(fullPath);

        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
          extension: entry.isFile() ? path.extname(entry.name) : undefined,
          isProtected: false,
        });
      }

      // Ordenar: directorios primero, luego por nombre
      return files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error: any) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Lee el contenido de un archivo
   */
  static readFile(filePath: string): FileContent {
    try {
      // Validar que no sea un archivo protegido
      const fileName = path.basename(filePath);
      if (this.isProtectedFile(fileName)) {
        throw new Error('Cannot read protected file: ' + fileName);
      }

      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        throw new Error('Path is a directory, not a file');
      }

      // Leer archivo
      const content = fs.readFileSync(filePath, 'utf8');

      return {
        content,
        encoding: 'utf8',
      };
    } catch (error: any) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  /**
   * Escribe contenido en un archivo
   */
  static writeFile(filePath: string, content: string): boolean {
    try {
      // Validar que no sea un archivo protegido
      const fileName = path.basename(filePath);
      if (this.isProtectedFile(fileName)) {
        throw new Error('Cannot write to protected file: ' + fileName);
      }

      // Crear directorio padre si no existe
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf8');
      console.log('File written:', filePath);

      return true;
    } catch (error: any) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  /**
   * Elimina un archivo o directorio
   */
  static deleteFile(filePath: string): boolean {
    try {
      // Validar que no sea un archivo protegido
      const fileName = path.basename(filePath);
      if (this.isProtectedFile(fileName)) {
        throw new Error('Cannot delete protected file: ' + fileName);
      }

      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
        console.log('Directory deleted:', filePath);
      } else {
        fs.unlinkSync(filePath);
        console.log('File deleted:', filePath);
      }

      return true;
    } catch (error: any) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo directorio
   */
  static createDirectory(dirPath: string): boolean {
    try {
      if (fs.existsSync(dirPath)) {
        throw new Error('Directory already exists');
      }

      fs.mkdirSync(dirPath, { recursive: true });
      console.log('Directory created:', dirPath);

      return true;
    } catch (error: any) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  /**
   * Renombra o mueve un archivo/directorio
   */
  static renameFile(oldPath: string, newPath: string): boolean {
    try {
      if (!fs.existsSync(oldPath)) {
        throw new Error('Source file does not exist');
      }

      if (fs.existsSync(newPath)) {
        throw new Error('Destination already exists');
      }

      fs.renameSync(oldPath, newPath);
      console.log('File renamed:', oldPath, '->', newPath);

      return true;
    } catch (error: any) {
      console.error('Error renaming file:', error);
      throw error;
    }
  }

  /**
   * Obtiene información de un archivo
   */
  static getFileInfo(filePath: string): FileInfo {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      const stats = fs.statSync(filePath);
      const name = path.basename(filePath);

      return {
        name,
        path: filePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
        extension: stats.isFile() ? path.extname(name) : undefined,
      };
    } catch (error: any) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }

  /**
   * Verifica si un archivo es editable (texto)
   */
  static isEditableFile(filePath: string): boolean {
    const editableExtensions = [
      '.json', '.txt', '.md', '.yaml', '.yml', '.xml', '.properties',
      '.conf', '.config', '.ini', '.log', '.sh', '.bat', '.js', '.ts',
    ];

    const ext = path.extname(filePath).toLowerCase();
    return editableExtensions.includes(ext);
  }

  /**
   * Detecta si un directorio contiene un servidor Hytale instalado
   */
  static isServerInstalled(dirPath: string): boolean {
    try {
      if (!fs.existsSync(dirPath)) {
        return false;
      }

      // Verificar si existen los scripts de inicio del servidor
      const startScriptWindows = path.join(dirPath, 'start-server.bat');
      const startScriptLinux = path.join(dirPath, 'start-server.sh');
      const startScriptMac = path.join(dirPath, 'start-server.sh');

      // Verificar si existen archivos claves del servidor
      const serverExePath = path.join(dirPath, 'hytale-server.jar');
      const configFile = path.join(dirPath, 'server.properties');

      const hasStartScript = fs.existsSync(startScriptWindows) || fs.existsSync(startScriptLinux) || fs.existsSync(startScriptMac);
      const hasServerFiles = fs.existsSync(serverExePath) || fs.existsSync(configFile);

      // Se considera instalado si tiene al menos script de inicio O archivos del servidor
      return hasStartScript || hasServerFiles;
    } catch (err) {
      return false;
    }
  }

  /**
   * Copia archivos a un directorio (para uploads)
   */
  static uploadFiles(targetDir: string, filePaths: string[]): { success: boolean; uploaded: string[]; failed: Array<{path: string; error: string}> } {
    try {
      if (!fs.existsSync(targetDir)) {
        throw new Error(`Target directory does not exist: ${targetDir}`);
      }

      const uploaded: string[] = [];
      const failed: Array<{path: string; error: string}> = [];

      for (const filePath of filePaths) {
        try {
          if (!fs.existsSync(filePath)) {
            failed.push({ path: filePath, error: 'File does not exist' });
            continue;
          }

          const stats = fs.statSync(filePath);
          if (!stats.isFile()) {
            failed.push({ path: filePath, error: 'Not a file' });
            continue;
          }

          const fileName = path.basename(filePath);
          const destPath = path.join(targetDir, fileName);

          fs.copyFileSync(filePath, destPath);
          uploaded.push(fileName);
        } catch (err: any) {
          failed.push({ path: filePath, error: err.message });
        }
      }

      return { success: failed.length === 0, uploaded, failed };
    } catch (err: any) {
      return { success: false, uploaded: [], failed: filePaths.map(p => ({ path: p, error: err.message })) };
    }
  }
}
