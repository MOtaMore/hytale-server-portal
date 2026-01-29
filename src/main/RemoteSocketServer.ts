/**
 * RemoteSocketServer - Servidor Socket.io para acceso remoto
 * Maneja conexiones remotas con autenticación JWT y validación de permisos
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { RemoteAccessManager } from '../shared/services/RemoteAccessManager';
import { PermissionsManager } from '../shared/services/PermissionsManager';
import { ServerManager } from '../shared/services/ServerManager';
import { ConfigManager } from '../shared/services/ConfigManager';
import { BackupManager } from '../shared/services/BackupManager';
import { FileManager } from '../shared/services/FileManager';
import { DiscordManager } from '../shared/services/DiscordManager';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  permissions?: string[];
}

interface CommandRequest {
  command: string;
  args?: any[];
  requestId: string;
}

interface CommandResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface CommandHandlers {
  serverManager: ServerManager;
  configManager: ConfigManager;
  backupManager: BackupManager;
  fileManager: typeof FileManager;
  discordManager: DiscordManager | null;
}

export class RemoteSocketServer {
  private io: SocketIOServer | null = null;
  private httpServer: HTTPServer | null = null;
  private remoteAccessManager: RemoteAccessManager;
  private permissionsManager: PermissionsManager;
  private handlers: CommandHandlers;
  private port: number;
  private isRunning: boolean = false;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(
    remoteAccessManager: RemoteAccessManager, 
    handlers: CommandHandlers,
    port: number = 9999
  ) {
    this.remoteAccessManager = remoteAccessManager;
    this.permissionsManager = PermissionsManager.getInstance();
    this.handlers = handlers;
    this.port = port;
  }

  /**
   * Inicia el servidor Socket.io
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('[RemoteSocketServer] Server is already running');
      return true;
    }

    try {
      // Crear servidor HTTP
      this.httpServer = createServer();

      // Crear servidor Socket.io con configuración de seguridad
      this.io = new SocketIOServer(this.httpServer, {
        cors: {
          origin: '*', // En producción, configurar dominios específicos
          methods: ['GET', 'POST'],
          credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        allowEIO3: true, // Compatibilidad con versiones antiguas
      });

      // Logs adicionales para debugging
      this.io.engine.on('connection_error', (err: any) => {
        console.error('[RemoteSocketServer] Engine connection error:', {
          message: err.message,
          code: err.code,
          context: err.context,
          req: err.req ? {
            url: err.req.url,
            headers: err.req.headers
          } : undefined
        });
      });

      // Middleware de autenticación - permite conexiones sin token para login
      this.io.use(async (socket: AuthenticatedSocket, next) => {
        try {
          const token = socket.handshake.auth.token;
          
          // Permitir conexión sin token (para el proceso de login)
          if (!token) {
            console.log('[RemoteSocketServer] Unauthenticated connection allowed for login');
            return next();
          }

          // Verificar JWT si existe token
          const decoded = this.remoteAccessManager.verifyJWT(token);
          
          if (!decoded || !decoded.userId) {
            return next(new Error('Invalid or expired token'));
          }

          // Obtener usuario desde RemoteAccessManager
          const users = this.remoteAccessManager.getRemoteUsers();
          const user = users.find((u: any) => u.id === decoded.userId);

          if (!user || !user.isActive) {
            return next(new Error('User not found or inactive'));
          }

          // Adjuntar datos del usuario al socket
          socket.userId = user.id;
          socket.username = user.username;
          socket.permissions = user.permissions;

          console.log(`[RemoteSocketServer] User authenticated: ${user.username}`);
          next();
        } catch (error: any) {
          console.error('[RemoteSocketServer] Authentication error:', error.message);
          next(new Error('Authentication failed'));
        }
      });

      // Manejar conexiones
      this.io.on('connection', (socket: AuthenticatedSocket) => {
        this.handleConnection(socket);
      });

      // Iniciar servidor HTTP
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.port, () => {
          console.log(`[RemoteSocketServer] Server started on port ${this.port}`);
          this.isRunning = true;
          resolve();
        }).on('error', (error) => {
          console.error('[RemoteSocketServer] Failed to start server:', error);
          reject(error);
        });
      });

      return true;
    } catch (error: any) {
      console.error('[RemoteSocketServer] Error starting server:', error);
      return false;
    }
  }

  /**
   * Detiene el servidor Socket.io
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[RemoteSocketServer] Stopping server...');

    // Desconectar todos los clientes
    this.connectedClients.forEach(socket => {
      socket.emit('server-shutdown', { message: 'Server is shutting down' });
      socket.disconnect(true);
    });

    this.connectedClients.clear();

    // Cerrar servidor Socket.io
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          console.log('[RemoteSocketServer] Socket.io server closed');
          resolve();
        });
      });
      this.io = null;
    }

    // Cerrar servidor HTTP
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => {
          console.log('[RemoteSocketServer] HTTP server closed');
          resolve();
        });
      });
      this.httpServer = null;
    }

    this.isRunning = false;
    console.log('[RemoteSocketServer] Server stopped');
  }

  /**
   * Maneja una nueva conexión de cliente
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const clientId = socket.id;
    const username = socket.username || 'unknown';

    console.log(`[RemoteSocketServer] Client connected: ${username} (${clientId})`);
    this.connectedClients.set(clientId, socket);

    // Enviar mensaje de bienvenida
    socket.emit('welcome', {
      message: 'Connected to Hytale Server Portal',
      username: socket.username,
      permissions: socket.permissions,
      serverId: 'hytale-server-1', // TODO: Obtener ID real del servidor
    });

    // Handler para login (antes de autenticar con token)
    socket.on('auth:login', async (data: { username: string; password: string }, callback) => {
      try {
        console.log(`[RemoteSocketServer] Login attempt from: ${data.username}`);
        
        const tokenData = await this.remoteAccessManager.authenticateRemoteUser(
          data.username,
          data.password
        );

        // Obtener el usuario completo para generar JWT
        const users = this.remoteAccessManager.getRemoteUsers();
        const user = users.find((u: any) => u.id === tokenData.userId);

        if (!user) {
          throw new Error('User not found after authentication');
        }

        // Crear JWT con los datos del usuario autenticado
        const jwt = this.remoteAccessManager.createJWT({
          ...user,
          passwordHash: '', // No incluir hash en el token
          permissions: tokenData.permissions,
        } as any);

        // Actualizar socket con datos del usuario
        socket.userId = tokenData.userId;
        socket.username = tokenData.username;
        socket.permissions = tokenData.permissions;

        console.log(`[RemoteSocketServer] Login successful: ${data.username}`);

        callback({
          success: true,
          token: jwt,
          userData: tokenData,
        });
      } catch (error: any) {
        console.error(`[RemoteSocketServer] Login failed:`, error.message);
        callback({
          success: false,
          error: error.message,
        });
      }
    });

    // Manejar comandos
    socket.on('command', async (data: CommandRequest, callback) => {
      await this.handleCommand(socket, data, callback);
    });

    // Manejar desconexión
    socket.on('disconnect', (reason) => {
      console.log(`[RemoteSocketServer] Client disconnected: ${username} (${reason})`);
      this.connectedClients.delete(clientId);
    });

    // Manejar errores
    socket.on('error', (error) => {
      console.error(`[RemoteSocketServer] Socket error for ${username}:`, error);
    });
  }

  /**
   * Maneja un comando enviado por un cliente remoto
   */
  private async handleCommand(
    socket: AuthenticatedSocket,
    request: CommandRequest,
    callback: (response: CommandResponse) => void
  ): Promise<void> {
    const { command, args = [], requestId } = request;
    const username = socket.username || 'unknown';

    console.log(`[RemoteSocketServer] Command received from ${username}: ${command}`);

    try {
      // Mapear comando a permiso requerido
      const requiredPermission = this.getRequiredPermission(command);

      // Validar permisos
      if (requiredPermission && socket.permissions) {
        const hasPermission = this.permissionsManager.hasPermission(
          socket.permissions,
          requiredPermission
        );

        if (!hasPermission) {
          console.warn(`[RemoteSocketServer] Permission denied for ${username}: ${command} requires ${requiredPermission}`);
          callback({
            requestId,
            success: false,
            error: `Permission denied. Required: ${requiredPermission}`,
          });
          return;
        }
      }

      // Ejecutar comando (aquí se delegará a los handlers IPC)
      const result = await this.executeCommand(command, args);

      callback({
        requestId,
        success: true,
        data: result,
      });

      console.log(`[RemoteSocketServer] Command executed successfully: ${command}`);
    } catch (error: any) {
      console.error(`[RemoteSocketServer] Command execution failed: ${command}`, error);
      callback({
        requestId,
        success: false,
        error: error.message || 'Command execution failed',
      });
    }
  }

  /**
   * Mapea un comando a su permiso requerido
   */
  private getRequiredPermission(command: string): string | null {
    const permissionMap: Record<string, string> = {
      // Server commands
      'server:start': 'server.start',
      'server:stop': 'server.stop',
      'server:restart': 'server.restart',
      'server:status': 'server.view_status',
      'server:logs': 'server.view_logs',

      // Config commands
      'config:read': 'config.read',
      'config:write': 'config.write',

      // Backup commands
      'backup:create': 'backup.create',
      'backup:restore': 'backup.restore',
      'backup:list': 'backup.view',
      'backup:delete': 'backup.delete',

      // File commands
      'files:upload': 'files.upload',
      'files:download': 'files.download',
      'files:delete': 'files.delete',
      'files:list': 'files.view',

      // Discord commands
      'discord:send': 'discord.send_messages',
      'discord:configure': 'discord.configure',
      'discord:view': 'discord.view',
    };

    return permissionMap[command] || null;
  }

  /**
   * Ejecuta un comando conectando con los servicios reales
   */
  private async executeCommand(command: string, args: any[]): Promise<any> {
    console.log(`[RemoteSocketServer] Executing command: ${command} with args:`, args);

    try {
      switch (command) {
        // ========== SERVER COMMANDS ==========
        case 'server:start':
          await this.handlers.serverManager.start();
          return { success: true, message: 'Server started' };

        case 'server:stop':
          await this.handlers.serverManager.stop();
          return { success: true, message: 'Server stopped' };

        case 'server:restart':
          await this.handlers.serverManager.restart();
          return { success: true, message: 'Server restarted' };

        case 'server:status': {
          const state = this.handlers.serverManager.getState();
          return {
            status: state.status,
            isRunning: state.status === 'running',
            pid: state.pid,
            uptime: state.uptime,
            lastLog: state.lastLog,
          };
        }

        case 'server:logs': {
          const logs = this.handlers.serverManager.getLogs();
          return { logs };
        }

        // ========== CONFIG COMMANDS ==========
        case 'config:read': {
          const config = await this.handlers.configManager.readConfig();
          return config;
        }

        case 'config:write': {
          const [newConfig] = args;
          if (!newConfig) {
            throw new Error('Config data required');
          }
          await this.handlers.configManager.writeConfig(newConfig);
          return { success: true, message: 'Config saved' };
        }

        // ========== BACKUP COMMANDS ==========
        case 'backup:create': {
          const [backupName, fullBackup] = args;
          const backup = await this.handlers.backupManager.createBackup(backupName, fullBackup || false);
          return backup;
        }

        case 'backup:restore': {
          const [backupId] = args;
          if (!backupId) {
            throw new Error('Backup ID required');
          }
          await this.handlers.backupManager.restoreBackup(backupId);
          return { success: true, message: 'Backup restored' };
        }

        case 'backup:list': {
          const backups = await this.handlers.backupManager.listBackups();
          return backups;
        }

        case 'backup:delete': {
          const [backupId] = args;
          if (!backupId) {
            throw new Error('Backup ID required');
          }
          await this.handlers.backupManager.deleteBackup(backupId);
          return { success: true, message: 'Backup deleted' };
        }

        // ========== FILE COMMANDS ==========
        case 'files:list': {
          const [directory] = args;
          const files = this.handlers.fileManager.listFiles(directory || '');
          return files;
        }

        case 'files:upload': {
          const [filePath, content] = args;
          if (!filePath || !content) {
            throw new Error('File path and content required');
          }
          this.handlers.fileManager.writeFile(filePath, content);
          return { success: true, message: 'File uploaded' };
        }

        case 'files:download': {
          const [filePath] = args;
          if (!filePath) {
            throw new Error('File path required');
          }
          const content = this.handlers.fileManager.readFile(filePath);
          return content;
        }

        case 'files:delete': {
          const [filePath] = args;
          if (!filePath) {
            throw new Error('File path required');
          }
          this.handlers.fileManager.deleteFile(filePath);
          return { success: true, message: 'File deleted' };
        }

        // ========== DISCORD COMMANDS ==========
        case 'discord:view': {
          if (!this.handlers.discordManager) {
            throw new Error('Discord manager not initialized');
          }
          const config = this.handlers.discordManager.getConfig();
          return config;
        }

        case 'discord:configure': {
          if (!this.handlers.discordManager) {
            throw new Error('Discord manager not initialized');
          }
          const [config] = args;
          if (!config) {
            throw new Error('Discord config required');
          }
          await this.handlers.discordManager.saveConfig(config);
          return { success: true, message: 'Discord config saved' };
        }

        case 'discord:send': {
          if (!this.handlers.discordManager) {
            throw new Error('Discord manager not initialized');
          }
          const [isOnline] = args;
          await this.handlers.discordManager.notifyServerStatus(isOnline ?? true);
          return { success: true, message: 'Discord notification sent' };
        }

        default:
          throw new Error(`Command not implemented: ${command}`);
      }
    } catch (error: any) {
      console.error(`[RemoteSocketServer] Command execution error:`, error);
      throw error;
    }
  }

  /**
   * Emite un evento a todos los clientes conectados
   */
  broadcastEvent(event: string, data: any): void {
    if (!this.io || !this.isRunning) {
      return;
    }

    this.io.emit(event, data);
    console.log(`[RemoteSocketServer] Broadcasted event: ${event}`);
  }

  /**
   * Emite un evento a un cliente específico
   */
  emitToClient(clientId: string, event: string, data: any): void {
    const socket = this.connectedClients.get(clientId);
    
    if (socket) {
      socket.emit(event, data);
      console.log(`[RemoteSocketServer] Emitted event to ${socket.username}: ${event}`);
    }
  }

  /**
   * Obtiene el número de clientes conectados
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Obtiene información de clientes conectados
   */
  getConnectedClients(): Array<{ id: string; username: string; permissions: string[] }> {
    return Array.from(this.connectedClients.values()).map(socket => ({
      id: socket.id,
      username: socket.username || 'unknown',
      permissions: socket.permissions || [],
    }));
  }

  /**
   * Verifica si el servidor está corriendo
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Cambia el puerto del servidor (requiere reinicio)
   */
  setPort(port: number): void {
    this.port = port;
  }

  /**
   * Obtiene el puerto actual
   */
  getPort(): number {
    return this.port;
  }
}
