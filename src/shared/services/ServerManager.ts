import { spawn, execSync, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export enum ServerStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error',
}

export interface ServerState {
  status: ServerStatus;
  pid?: number;
  uptime?: number;
  lastLog?: string;
}

/**
 * Gestor centralizado del servidor Hytale
 * Utiliza patrón Singleton para garantizar una única instancia
 */
export class ServerManager {
  private static instance: ServerManager;
  private serverProcess: ChildProcess | null = null;
  private status: ServerStatus = ServerStatus.STOPPED;
  private serverPath: string | null = null;
  private logs: string[] = [];
  private maxLogs = 1000;
  private startTime: number | null = null;
  private statusListeners: Set<(state: ServerState) => void> = new Set();

  private constructor() {}

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  /**
   * Establece la ruta del servidor
   */
  setServerPath(path: string): void {
    this.serverPath = path;
  }

  /**
   * Obtiene la ruta del servidor
   */
  getServerPath(): string | null {
    return this.serverPath;
  }

  /**
   * Obtiene el estado actual del servidor
   */
  getStatus(): ServerStatus {
    return this.status;
  }

  /**
   * Obtiene el estado completo del servidor
   */
  getState(): ServerState {
    return {
      status: this.status,
      pid: this.serverProcess?.pid,
      uptime: this.startTime ? Date.now() - this.startTime : undefined,
      lastLog: this.logs[this.logs.length - 1],
    };
  }

  /**
   * Obtiene los logs del servidor
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Limpia los logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Inicia el servidor
   */
  async start(): Promise<void> {
    if (this.status !== ServerStatus.STOPPED) {
      throw new Error('Server is already running or starting');
    }

    if (!this.serverPath) {
      throw new Error('Server path not set');
    }

    if (!fs.existsSync(this.serverPath)) {
      throw new Error('Server executable not found');
    }

    this.status = ServerStatus.STARTING;
    this.notifyListeners();

    try {
      // Detectar el sistema operativo y ejecutar el script apropiado
      const isWindows = process.platform === 'win32';
      const isLinux = process.platform === 'linux';
      const scriptName = isWindows ? 'start-server.bat' : 'start-server.sh';
      const scriptPath = path.join(this.serverPath, scriptName);

      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Server startup script not found: ${scriptPath}`);
      }

      // En Linux, usar screen para capturar toda la salida
      if (isLinux) {
        const sessionName = 'HytaleServer'; // Debe coincidir con el script
        
        // Hacer el script ejecutable
        fs.chmodSync(scriptPath, 0o755);
        
        // Ejecutar el script directamente (que crea la sesión screen internamente)
        this.serverProcess = spawn('bash', [scriptPath], {
          cwd: this.serverPath,
          shell: false,
          stdio: 'ignore', // Ignorar completamente stdout/stderr del script
        });

        // Esperar a que se cree el archivo server.log
        let logPath = path.join(this.serverPath, 'server.log');
        let retries = 0;
        const waitForLog = setInterval(() => {
          if (fs.existsSync(logPath)) {
            clearInterval(waitForLog);
            // El archivo existe, empezar a leerlo
            let lastSize = 0;
            
            const logWatcher = setInterval(() => {
              try {
                if (fs.existsSync(logPath)) {
                  const content = fs.readFileSync(logPath, 'utf8');
                  
                  // Si el archivo tiene más contenido que antes
                  if (content.length > lastSize) {
                    // Extraer solo la nueva parte
                    const newContent = content.substring(lastSize);
                    const lines = newContent.split('\n').filter(line => line.trim().length > 0);
                    
                    // Agregar cada línea al log
                    lines.forEach(line => {
                      this.addLog(this.stripAnsiCodes(line));
                    });
                    
                    // Actualizar el tamaño leído
                    lastSize = content.length;
                  }
                }
              } catch (err) {
                // No es crítico si el archivo no existe aún
              }
            }, 100);

            // Guardar intervalo para limpiarlo después
            (this.serverProcess as any).logWatcher = logWatcher;
          } else {
            retries++;
            if (retries > 50) {
              // Después de 5 segundos, parar de esperar
              clearInterval(waitForLog);
            }
          }
        }, 100);

        // Guardar el intervalo de espera también
        (this.serverProcess as any).waitForLog = waitForLog;
      } else {
        // Windows y Mac: usar spawn normal
        this.serverProcess = spawn(scriptPath, {
          cwd: this.serverPath,
          shell: true,
        });

        // Capturar salida estándar
        this.serverProcess.stdout?.on('data', (data: Buffer) => {
          this.addLog(`[STDOUT] ${data.toString().trim()}`);
        });

        // Capturar errores
        this.serverProcess.stderr?.on('data', (data: Buffer) => {
          this.addLog(`[STDERR] ${data.toString().trim()}`);
        });
      }

      this.startTime = Date.now();

      // Manejar cierre del proceso
      this.serverProcess.on('close', (code: number) => {
        // El script de inicio termina después de lanzar screen, esto es normal
        
        // Limpiar watcher de logs si existe (Linux)
        const logWatcher = (this.serverProcess as any)?.logWatcher;
        if (logWatcher) {
          clearInterval(logWatcher);
        }
        
        if (isLinux) {
          // En Linux, el script inicia el servidor en screen y luego sale
          // Verificar después de 2 segundos si el servidor está corriendo
          setTimeout(() => {
            const sessionName = 'HytaleServer';
            
            // Verificar si la sesión screen existe
            try {
              (execSync as any)(`screen -list 2>/dev/null | grep -q "${sessionName}"`, { shell: true });
              this.status = ServerStatus.RUNNING;
              this.addLog('✓ Server started successfully');
              this.notifyListeners();
            } catch (err) {
              // Screen no está corriendo
              if (code === 0) {
                this.status = ServerStatus.ERROR;
                this.addLog('✗ Server failed to start (screen session not found)');
              } else {
                this.status = ServerStatus.ERROR;
              }
              this.notifyListeners();
            }
          }, 2000);
        } else {
          // Windows/Mac - el proceso permaneció vivo
          this.status = code === 0 ? ServerStatus.STOPPED : ServerStatus.ERROR;
          this.serverProcess = null;
          this.startTime = null;
          this.notifyListeners();
        }
      });

      // Manejar errores
      this.serverProcess.on('error', (error: Error) => {
        this.addLog(`Server process error: ${error.message}`);
        this.status = ServerStatus.ERROR;
        this.notifyListeners();
      });

      this.status = ServerStatus.RUNNING;
      this.notifyListeners();
    } catch (error: any) {
      this.status = ServerStatus.ERROR;
      this.addLog(`Failed to start server: ${error.message}`);
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Detiene el servidor
   */
  async stop(): Promise<void> {
    if (this.status === ServerStatus.STOPPED) {
      throw new Error('Server is not running');
    }

    this.status = ServerStatus.STOPPING;
    this.notifyListeners();

    try {
      const isLinux = process.platform === 'linux';
      
      if (isLinux) {
        // En Linux, ejecutar el script stop-server.sh
        const scriptPath = path.join(this.serverPath || '', 'stop-server.sh');
        
        if (fs.existsSync(scriptPath)) {
          // Hacer ejecutable
          fs.chmodSync(scriptPath, 0o755);
          
          // Ejecutar script de parada
          const stopProcess = spawn('bash', [scriptPath], {
            cwd: this.serverPath || undefined,
            shell: false,
          });

          // Esperar a que termine
          await new Promise<void>((resolve) => {
            (stopProcess as any).on('close', () => {
              this.addLog('Stop script completed');
              resolve();
            });
          });
        } else {
          // Si no existe el script, intentar matar la sesión de screen directamente
          const sessionName = 'HytaleServer';
          try {
            (execSync as any)(`screen -S "${sessionName}" -X quit`, { shell: true });
          } catch (err) {
            // No es crítico si fallla
          }
        }
        
        // Limpiar watcher de logs si existe
        const logWatcher = (this.serverProcess as any)?.logWatcher;
        if (logWatcher) {
          clearInterval(logWatcher);
        }

        // Limpiar intervalo de espera del log si existe
        const waitForLog = (this.serverProcess as any)?.waitForLog;
        if (waitForLog) {
          clearInterval(waitForLog);
        }
        
        this.serverProcess = null;
        this.status = ServerStatus.STOPPED;
        this.startTime = null;
        this.notifyListeners();
      } else if (this.serverProcess) {
        // Windows/Mac: usar kill normal
        // Intentar terminar gracefully primero
        this.serverProcess.kill('SIGTERM');

        // Si no termina en 5 segundos, forzar kill
        const killTimeout = setTimeout(() => {
          if (this.serverProcess) {
            this.serverProcess.kill('SIGKILL');
            this.addLog('Server force killed');
          }
        }, 5000);

        // Esperar a que el proceso termine
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!this.serverProcess) {
              clearInterval(checkInterval);
              clearTimeout(killTimeout);
              resolve(null);
            }
          }, 100);
        });
        
        this.status = ServerStatus.STOPPED;
        this.startTime = null;
        this.addLog('Server stopped');
        this.notifyListeners();
      }
    } catch (error: any) {
      this.status = ServerStatus.ERROR;
      this.addLog(`Failed to stop server: ${error.message}`);
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Reinicia el servidor
   */
  async restart(): Promise<void> {
    await this.stop();
    // Esperar 1 segundo antes de reiniciar
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }

  /**
   * Envía un comando al servidor
   */
  sendCommand(command: string): void {
    const isLinux = process.platform === 'linux';
    
    if (isLinux) {
      // En Linux, enviar comando a la sesión screen
      const sessionName = 'HytaleServer';
      try {
        // Escapar caracteres especiales para el comando screen
        const escapedCommand = command.replace(/"/g, '\\"');
        const screenCommand = `screen -S "${sessionName}" -X stuff "${escapedCommand}\n"`;
        
        (execSync as any)(screenCommand, { shell: true });
        this.addLog(`> ${command}`);
        
        // Capturar la respuesta del servidor leyendo la sesión screen directamente
        // Esto es necesario porque en terminal "dumb" las respuestas no se escriben a stdout
        const tempFile = `/tmp/hytale_screen_${Date.now()}.txt`;
        let captureCount = 0;
        const maxCaptures = 50; // 5 segundos máximo (50 * 100ms)
        
        const captureInterval = setInterval(() => {
          try {
            // Capturar el contenido de la pantalla de screen
            (execSync as any)(
              `screen -S "${sessionName}" -p 0 -d -X hardcopy -h "${tempFile}" 2>/dev/null`,
              { shell: true, stdio: 'ignore' }
            );
            
            if (fs.existsSync(tempFile)) {
              const content = fs.readFileSync(tempFile, 'utf8');
              const lines = content.split('\n');
              
              // Buscar respuestas del servidor (líneas que contienen patrones típicos)
              lines.forEach(line => {
                const cleaned = this.stripAnsiCodes(line).trim();
                // Agregar líneas que parecen respuestas del servidor
                if (cleaned.length > 0 && 
                    !cleaned.includes('>') && 
                    !cleaned.includes(sessionName) &&
                    !cleaned.startsWith('[') === false) { // Incluir líneas con [timestamp]
                  
                  // Verificar si es una línea que aún no hemos agregado
                  const lastLog = this.logs[this.logs.length - 1] || '';
                  if (!lastLog.includes(cleaned) && cleaned.length > 5) {
                    this.addLog(cleaned);
                  }
                }
              });
              
              // Limpiar archivo temporal
              try {
                fs.unlinkSync(tempFile);
              } catch (err) {}
            }
          } catch (err) {
            // Silenciar errores
          }
          
          captureCount++;
          if (captureCount >= maxCaptures) {
            clearInterval(captureInterval);
          }
        }, 100);
        
      } catch (err: any) {
        this.addLog(`[ERROR] Failed to send command: ${command}`);
      }
    } else if (this.serverProcess && this.serverProcess.stdin) {
      // Windows/Mac: usar stdin del proceso
      this.addLog(`> ${command}`);
      this.serverProcess.stdin.write(command + '\n');
    } else {
      throw new Error('Server is not running');
    }
  }

  /**
   * Se suscribe a cambios de estado
   */
  onStatusChange(listener: (state: ServerState) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Limpia códigos ANSI de colores del mensaje
   */
  private stripAnsiCodes(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\[0;\d+m/g, '').replace(/\[0m/g, '');
  }

  /**
   * Agrega un log
   */
  private addLog(message: string): void {
    const cleanMessage = this.stripAnsiCodes(message);
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${cleanMessage}`;
    this.logs.push(logEntry);

    // Limitar cantidad de logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Notifica a todos los listeners de cambios de estado
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.statusListeners.forEach((listener) => listener(state));
  }
}
