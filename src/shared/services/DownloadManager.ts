import { app, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const yauzl = require('yauzl');
const execFileAsync = promisify(execFile);

/**
 * Copia un directorio recursivamente
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export enum DownloadStatus {
  IDLE = 'IDLE',
  SELECTING_FOLDER = 'SELECTING_FOLDER',
  COPYING_CLI = 'COPYING_CLI',
  CLI_READY = 'CLI_READY',
  CHECKING_VERSION = 'CHECKING_VERSION',
  AUTHENTICATING = 'AUTHENTICATING',
  DOWNLOADING_SERVER = 'DOWNLOADING_SERVER',
  EXTRACTING = 'EXTRACTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface DownloadManagerState {
  status: DownloadStatus;
  progress: number;
  message: string;
  serverPath?: string;
  serverVersion?: string;
  error?: string;
  deviceCodeUrl?: string;
  deviceCode?: string;
}

/**
 * Gestor de descargas del CLI de Hytale
 * Maneja copia de CLI, verificación y descarga del servidor
 */
export class DownloadManager {
  private static state: DownloadManagerState = {
    status: DownloadStatus.IDLE,
    progress: 0,
    message: 'Ready',
  };

  private static lastAuthUrlOpened: string | null = null;

  private static getResourcesPath(): string {
    // En desarrollo: desde la raíz del proyecto
    // En producción: desde app.getAppPath()
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'resources', 'HytaleServer');
    }
    // En producción, resources está en la raíz de la app empaquetada
    return path.join(app.getAppPath(), 'resources', 'HytaleServer');
  }
  
  /**
   * Obtiene el nombre del CLI según el SO
   */
  private static getCLIName(): string {
    if (process.platform === 'win32') {
      return 'hytale-downloader-windows-amd64.exe';
    }
    return 'hytale-downloader-linux-amd64';
  }

  /**
   * Obtiene el nombre del script de inicio
   */
  private static getStartScriptName(): string {
    return process.platform === 'win32' ? 'start-server.bat' : 'start-server.sh';
  }

  /**
   * Obtiene el nombre del script de parada
   */
  private static getStopScriptName(): string {
    return process.platform === 'win32' ? 'stop-server.bat' : 'stop-server.sh';
  }

  /**
   * Obtiene el estado actual
   */
  static getState(): DownloadManagerState {
    return { ...this.state };
  }

  /**
   * Resetea el estado de descarga (para reintentalo)
   */
  static resetDownloadState(): void {
    this.lastAuthUrlOpened = null;
    this.setState({
      status: DownloadStatus.IDLE,
      progress: 0,
      message: 'Ready',
      error: undefined,
      deviceCodeUrl: undefined,
      deviceCode: undefined,
    });
  }

  /**
   * Actualiza el estado
   */
  private static setState(state: Partial<DownloadManagerState>): void {
    this.state = { ...this.state, ...state };
  }

  /**
   * Copia los archivos CLI y scripts a la carpeta del servidor
   */
  static async setupServerFolder(serverPath: string): Promise<boolean> {
    try {
      // Validar ruta
      if (!serverPath || typeof serverPath !== 'string') {
        throw new Error('Invalid server path');
      }

      this.setState({
        status: DownloadStatus.COPYING_CLI,
        message: 'Copying CLI and scripts...',
        progress: 0,
        serverPath,
      });

      // Crear directorio si no existe
      if (!fs.existsSync(serverPath)) {
        fs.mkdirSync(serverPath, { recursive: true });
      }

      const cliName = this.getCLIName();
      const resourcesPath = this.getResourcesPath();
      const cliSource = path.join(resourcesPath, cliName);
      const cliDest = path.join(serverPath, cliName);

      console.log('Resources path:', resourcesPath);
      console.log('CLI source:', cliSource);
      console.log('CLI destination:', cliDest);

      // Copiar CLI
      if (!fs.existsSync(cliSource)) {
        const errorMsg = `CLI not found. Please ensure the Hytale CLI is in: ${resourcesPath}`;
        this.setState({
          status: DownloadStatus.ERROR,
          error: errorMsg,
          message: errorMsg,
          progress: 0,
        });
        throw new Error(errorMsg);
      }

      fs.copyFileSync(cliSource, cliDest);
      
      // Hacer ejecutable en Linux/Mac
      if (process.platform !== 'win32') {
        fs.chmodSync(cliDest, '755');
      }

      console.log('CLI copied to:', cliDest);

      // Copiar scripts de inicio/parada
      const startScriptName = this.getStartScriptName();
      const stopScriptName = this.getStopScriptName();

      const startScriptSource = path.join(resourcesPath, startScriptName);
      const startScriptDest = path.join(serverPath, startScriptName);

      const stopScriptSource = path.join(resourcesPath, stopScriptName);
      const stopScriptDest = path.join(serverPath, stopScriptName);

      if (fs.existsSync(startScriptSource)) {
        fs.copyFileSync(startScriptSource, startScriptDest);
        if (process.platform !== 'win32') {
          fs.chmodSync(startScriptDest, '755');
        }
      }

      if (fs.existsSync(stopScriptSource)) {
        fs.copyFileSync(stopScriptSource, stopScriptDest);
        if (process.platform !== 'win32') {
          fs.chmodSync(stopScriptDest, '755');
        }
      }

      this.setState({
        status: DownloadStatus.CLI_READY,
        message: 'CLI and scripts ready',
        progress: 50,
      });

      return true;
    } catch (error: any) {
      console.error('Error setting up server folder:', error);
      this.setState({
        status: DownloadStatus.ERROR,
        message: error.message,
        error: error.message,
        progress: 0,
      });
      return false;
    }
  }

  /**
   * Verifica la versión del servidor sin descargar
   */
  static async checkServerVersion(serverPath: string): Promise<string> {
    try {
      this.setState({
        status: DownloadStatus.CHECKING_VERSION,
        message: 'Checking server version...',
        progress: 60,
      });

      const cliName = this.getCLIName();
      const cliPath = path.join(serverPath, cliName);

      if (!fs.existsSync(cliPath)) {
        throw new Error('CLI not found in server folder');
      }

      const { stdout } = await execFileAsync(cliPath, ['-print-version'], {
        cwd: serverPath,
      });

      const version = stdout.trim();
      console.log('Server version:', version);

      this.setState({
        status: DownloadStatus.CLI_READY,
        message: `Server version: ${version}`,
        progress: 100,
        serverVersion: version,
      });

      return version;
    } catch (error: any) {
      console.error('Error checking version:', error);
      throw new Error(`Failed to check version: ${error.message}`);
    }
  }

  /**
   * Inicia el proceso de descarga del servidor
   */
  static async downloadServer(serverPath: string): Promise<void> {
    try {
      if (!serverPath || typeof serverPath !== 'string') {
        throw new Error('Invalid server path');
      }

      this.setState({
        status: DownloadStatus.DOWNLOADING_SERVER,
        message: 'Starting download...',
        progress: 0,
        serverPath,
      });

      const cliName = this.getCLIName();
      const cliPath = path.join(serverPath, cliName);

      if (!fs.existsSync(cliPath)) {
        const errorMsg = 'CLI not found in server folder. Please run setup first.';
        this.setState({
          status: DownloadStatus.ERROR,
          error: errorMsg,
          message: errorMsg,
          progress: 0,
        });
        throw new Error(errorMsg);
      }

      const downloadPath = path.join(serverPath, 'game.zip');

      console.log('Starting CLI download process...');
      console.log('CLI Path:', cliPath);
      console.log('Download Path:', downloadPath);

      // Ejecutar el CLI para descargar
      return new Promise((resolve, reject) => {
        console.log('=== CLI PROCESS START ===');
        const cliProcess = spawn(cliPath, ['-download-path', downloadPath], {
          cwd: serverPath,
          stdio: ['inherit', 'pipe', 'pipe'],
          shell: false,
        });

        let fullOutput = '';
        let lastProgress = 0;
        let lastAuthUrl = this.state.deviceCodeUrl;
        let lastAuthCode = this.state.deviceCode;
        let authShown = false;

        const processOutput = (output: string, isStderr: boolean = false) => {
          fullOutput += output;
          const prefix = isStderr ? '[STDERR]' : '[STDOUT]';
          console.log(`CLI ${prefix}:`, output.substring(0, 200));

          if (!output || output.length === 0) return;

          // Buscar URL/código de autenticación (device code flow)
          const lines = output.split('\n');
          let authDetected = false;
          let urlFromOutput = lastAuthUrl;
          let codeFromOutput = lastAuthCode;

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // URL de autenticación (aceptar http/https y query user_code)
            const urlMatch = line.match(/https?:\/\/[^\s"'<>]+/i);
            if (urlMatch) {
              urlFromOutput = urlMatch[0];
              authDetected = true;
              console.log('Found auth URL:', urlFromOutput);
            }

            // Código de dispositivo (formato ABCD-1234 o similar, también XXX-XXXX)
            const deviceCodeMatch = line.match(/([A-Z0-9]{3,})-([A-Z0-9-]{3,})/i);
            if (deviceCodeMatch && line.length < 50) {
              codeFromOutput = line.toUpperCase();
              authDetected = true;
              console.log('Found device code:', codeFromOutput);
            }

            // Señales textuales de auth
            if (/device/i.test(line) || /authorize/i.test(line) || /visit/i.test(line) || /enter code/i.test(line)) {
              authDetected = true;
            }
          }

          if (authDetected && !authShown) {
            authShown = true;
            this.setState({
              status: DownloadStatus.AUTHENTICATING,
              message: fullOutput.trim() || output.trim(),
              progress: 0,
              deviceCodeUrl: urlFromOutput || this.state.deviceCodeUrl,
              deviceCode: codeFromOutput || this.state.deviceCode,
            });

            // Abrir navegador automáticamente una sola vez
            if (urlFromOutput && urlFromOutput !== this.lastAuthUrlOpened) {
              console.log('Opening auth URL in browser:', urlFromOutput);
              shell.openExternal(urlFromOutput).catch((err) => console.error('Failed to open auth URL', err));
              this.lastAuthUrlOpened = urlFromOutput;
            }

            lastAuthUrl = urlFromOutput;
            lastAuthCode = codeFromOutput;
            console.log('Authentication detected! URL:', urlFromOutput, 'Code:', codeFromOutput);
          }

          // Parsear progreso de descarga
          for (const line of lines) {
            if (line.includes('%')) {
              const match = line.match(/(\d+)%/);
              if (match) {
                const progress = parseInt(match[1]);
                if (progress > lastProgress) {
                  lastProgress = progress;
                  this.setState({
                    status: DownloadStatus.DOWNLOADING_SERVER,
                    progress,
                    message: line.trim(),
                  });
                }
              }
            } else if (line.toLowerCase().includes('download') && line.toLowerCase().includes('complete')) {
              this.setState({
                status: DownloadStatus.COMPLETED,
                progress: 100,
                message: 'Download completed successfully',
              });
            }
          }
        };

        cliProcess.stdout?.on('data', (data) => {
          processOutput(data.toString(), false);
        });

        cliProcess.stderr?.on('data', (data) => {
          const error = data.toString();
          
          // El CLI puede escribir información importante en stderr
          processOutput(error, true);
        });

        cliProcess.on('close', (code) => {
          console.log('CLI process exited with code:', code);
          console.log('Full output:', fullOutput);
          
          if (code === 0) {
            // Descarga completada, ahora extraer
            this.setState({
              status: DownloadStatus.EXTRACTING,
              progress: 90,
              message: 'Extrayendo archivos...',
            });

            // Extraer en el siguiente tick para no bloquear
            setTimeout(() => {
              this.extractServer(serverPath)
                .then(() => {
                  resolve();
                })
                .catch((err) => {
                  reject(err);
                });
            }, 100);
          } else {
            const errorMsg = `CLI process exited with code ${code}. Check console for details.`;
            this.setState({
              status: DownloadStatus.ERROR,
              error: errorMsg,
              message: errorMsg,
              progress: 0,
            });
            reject(new Error(errorMsg));
          }
        });

        cliProcess.on('error', (err) => {
          const errorMsg = `Failed to start CLI: ${err.message}`;
          console.error('CLI spawn error:', err);
          this.setState({
            status: DownloadStatus.ERROR,
            error: errorMsg,
            message: errorMsg,
            progress: 0,
          });
          reject(new Error(errorMsg));
        });
      });
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      console.error('Download error:', error);
      this.setState({
        status: DownloadStatus.ERROR,
        error: errorMsg,
        message: errorMsg,
        progress: 0,
      });
      throw error;
    }
  }

  /**
   * Extrae el archivo game.zip usando streaming (funciona en Windows, Linux, Mac)
   */
  static async extractServer(serverPath: string): Promise<boolean> {
    try {
      this.setState({
        status: DownloadStatus.EXTRACTING,
        message: 'Extrayendo archivos...',
        progress: 0,
      });

      const zipPath = path.join(serverPath, 'game.zip');

      if (!fs.existsSync(zipPath)) {
        throw new Error('game.zip not found');
      }

      console.log('Extracting with yauzl:', zipPath);

      return new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (err: any, zipfile: any) => {
          if (err) {
            console.error('Failed to open ZIP:', err);
            reject(err);
            return;
          }

          let extractedCount = 0;
          let totalCount = zipfile.entryCount || 0;
          let pendingWrites = 0;
          let hasError = false;

          console.log(`ZIP contains ${totalCount} entries`);

          zipfile.on('entry', (entry: any) => {
            if (hasError) return;

            const entryPath = path.join(serverPath, entry.fileName);
            
            // Actualizar progreso
            extractedCount++;
            const progress = totalCount > 0 ? Math.floor((extractedCount / totalCount) * 100) : 0;
            this.setState({
              status: DownloadStatus.EXTRACTING,
              progress: Math.min(progress, 99),
              message: `Extrayendo... ${extractedCount}/${totalCount}`,
            });

            if (/\/$/.test(entry.fileName)) {
              // Es un directorio
              console.log('Creating directory:', entry.fileName);
              fs.mkdirSync(entryPath, { recursive: true });
              zipfile.readEntry();
            } else {
              // Es un archivo
              console.log('Extracting file:', entry.fileName);
              
              // Crear directorio padre si no existe
              const dirPath = path.dirname(entryPath);
              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
              }

              pendingWrites++;

              zipfile.openReadStream(entry, (err2: any, readStream: any) => {
                if (err2) {
                  console.error('Error opening read stream:', err2);
                  hasError = true;
                  reject(err2);
                  return;
                }

                const writeStream = fs.createWriteStream(entryPath);

                readStream.on('error', (err3: any) => {
                  console.error('Read stream error:', err3);
                  hasError = true;
                  reject(err3);
                });

                writeStream.on('error', (err4: any) => {
                  console.error('Write stream error:', err4);
                  hasError = true;
                  reject(err4);
                });

                writeStream.on('finish', () => {
                  pendingWrites--;
                  
                  // Si terminamos de escribir todos los archivos y leímos todas las entradas
                  if (pendingWrites === 0 && extractedCount === totalCount) {
                    finishExtraction();
                  } else {
                    zipfile.readEntry();
                  }
                });

                readStream.pipe(writeStream);
              });
            }
          });

          zipfile.on('end', () => {
            console.log('ZIP reading finished, extracted:', extractedCount);
            
            // Si no hay escrituras pendientes, finalizar
            if (pendingWrites === 0) {
              finishExtraction();
            }
          });

          zipfile.on('error', (err: any) => {
            console.error('ZIP error:', err);
            hasError = true;
            reject(err);
          });

          const finishExtraction = () => {
            if (hasError) return;

            zipfile.close();
            console.log('Extraction complete');

            // Mover contenido de Server/ a la raíz
            try {
              const serverFolderPath = path.join(serverPath, 'Server');
              if (fs.existsSync(serverFolderPath)) {
                console.log('Moving Server/ contents to root...');

                // Copiar todos los archivos de Server/ a la raíz
                const files = fs.readdirSync(serverFolderPath);
                for (const file of files) {
                  const srcPath = path.join(serverFolderPath, file);
                  const destPath = path.join(serverPath, file);

                  if (fs.lstatSync(srcPath).isDirectory()) {
                    // Copiar directorio recursivamente
                    copyDirRecursive(srcPath, destPath);
                  } else {
                    // Copiar archivo
                    fs.copyFileSync(srcPath, destPath);
                  }
                }

                // Eliminar carpeta Server/
                fs.rmSync(serverFolderPath, { recursive: true });
                console.log('Server/ folder removed');
              }
            } catch (err) {
              console.warn('Could not move Server folder:', err);
            }

            // Eliminar archivos start.bat y start.sh
            try {
              const startBat = path.join(serverPath, 'start.bat');
              const startSh = path.join(serverPath, 'start.sh');
              
              if (fs.existsSync(startBat)) {
                fs.unlinkSync(startBat);
                console.log('start.bat deleted');
              }
              
              if (fs.existsSync(startSh)) {
                fs.unlinkSync(startSh);
                console.log('start.sh deleted');
              }
            } catch (err) {
              console.warn('Could not delete start scripts:', err);
            }

            this.setState({
              status: DownloadStatus.COMPLETED,
              progress: 100,
              message: 'Servidor descargado y extraído exitosamente',
              serverPath: serverPath,
            });

            // Eliminar el ZIP después de extraer
            try {
              fs.unlinkSync(zipPath);
              console.log('game.zip deleted');
            } catch (err) {
              console.warn('Could not delete game.zip:', err);
            }

            resolve(true);
          };

          // Iniciar lectura
          zipfile.readEntry();
        });
      });
    } catch (error: any) {
      console.error('Extraction error:', error);
      this.setState({
        status: DownloadStatus.ERROR,
        error: error.message,
        message: `Error durante la extracción: ${error.message}`,
        progress: 0,
      });
      return false;
    }
  }

  /**
   * Obtiene la ruta del recurso CLI
   */
  static getResourcesCLIPath(): string {
    return this.getResourcesPath();
  }
}

