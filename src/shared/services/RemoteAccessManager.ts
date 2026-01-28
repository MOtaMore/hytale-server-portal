/**
 * RemoteAccessManager - Gestión de acceso remoto y usuarios
 * Maneja: crear/editar/eliminar usuarios remotos, generar tokens, validar acceso
 */

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

export interface RemoteUser {
  id: string;
  username: string;
  email?: string;
  passwordHash: string;
  permissions: string[];
  createdAt: number;
  lastAccess?: number;
  isActive: boolean;
}

export interface RemoteAccessConfig {
  enabled: boolean;
  secret: string;
  port: number;
  allowedMethods: ('ip' | 'tunnel')[];
  ipv4?: string;
  ipv6?: string;
  tunnelUrl?: string;
  users: RemoteUser[];
}

export interface RemoteLoginToken {
  userId: string;
  username: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export class RemoteAccessManager {
  private static instance: RemoteAccessManager;
  private config: RemoteAccessConfig;
  private configPath: string;
  private readonly JWT_EXPIRY = 7 * 24 * 60 * 60; // 7 días

  private constructor(dataPath: string) {
    this.configPath = path.join(dataPath, 'remote-access.json');
    this.config = this.loadConfig();
  }

  /**
   * Inicializa el manager
   */
  static initialize(dataPath: string): RemoteAccessManager {
    if (!RemoteAccessManager.instance) {
      RemoteAccessManager.instance = new RemoteAccessManager(dataPath);
    }
    return RemoteAccessManager.instance;
  }

  /**
   * Obtiene la instancia
   */
  static getInstance(): RemoteAccessManager {
    if (!RemoteAccessManager.instance) {
      throw new Error('RemoteAccessManager no inicializado. Llama a initialize() primero.');
    }
    return RemoteAccessManager.instance;
  }

  /**
   * Carga la configuración desde archivo
   */
  private loadConfig(): RemoteAccessConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error cargando configuración remota:', error);
    }

    // Configuración por defecto
    return {
      enabled: false,
      secret: this.generateSecret(),
      port: 9999,
      allowedMethods: ['ip', 'tunnel'],
      users: [],
    };
  }

  /**
   * Guarda la configuración en archivo
   */
  private saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error guardando configuración remota:', error);
    }
  }

  /**
   * Genera un secreto aleatorio para JWT
   */
  private generateSecret(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Habilita o deshabilita el acceso remoto
   */
  setRemoteAccessEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  /**
   * Obtiene si el acceso remoto está habilitado
   */
  isRemoteAccessEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Configura los métodos de conexión
   */
  setConnectionMethods(config: {
    methods?: ('ip' | 'tunnel')[];
    ipv4?: string;
    ipv6?: string;
    tunnelUrl?: string;
  }): void {
    if (config.methods) {
      this.config.allowedMethods = config.methods;
    }
    if (config.ipv4) {
      this.config.ipv4 = config.ipv4;
    }
    if (config.ipv6) {
      this.config.ipv6 = config.ipv6;
    }
    if (config.tunnelUrl) {
      this.config.tunnelUrl = config.tunnelUrl;
    }
    this.saveConfig();
  }

  /**
   * Obtiene la configuración de conexión
   */
  getConnectionConfig() {
    return {
      enabled: this.config.enabled,
      methods: this.config.allowedMethods,
      port: this.config.port,
      ipv4: this.config.ipv4,
      ipv6: this.config.ipv6,
      tunnelUrl: this.config.tunnelUrl,
    };
  }

  /**
   * Crea un nuevo usuario remoto
   */
  async createRemoteUser(
    username: string,
    password: string,
    permissions: string[],
    email?: string,
  ): Promise<RemoteUser> {
    // Validación
    if (!username || username.length < 3) {
      throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
    }
    if (!password || password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    // Verifica que el usuario no exista
    if (this.config.users.some((u) => u.username === username)) {
      throw new Error('El usuario ya existe');
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser: RemoteUser = {
      id: this.generateId(),
      username,
      email,
      passwordHash,
      permissions,
      createdAt: Date.now(),
      isActive: true,
    };

    this.config.users.push(newUser);
    this.saveConfig();

    return { ...newUser, passwordHash: '' }; // No devuelve hash
  }

  /**
   * Actualiza permisos de un usuario
   */
  updateUserPermissions(userId: string, permissions: string[]): RemoteUser {
    const user = this.config.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    user.permissions = permissions;
    this.saveConfig();
    return { ...user, passwordHash: '' };
  }

  /**
   * Desactiva un usuario remoto
   */
  deactivateUser(userId: string): void {
    const user = this.config.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    user.isActive = false;
    this.saveConfig();
  }

  /**
   * Elimina un usuario remoto
   */
  deleteRemoteUser(userId: string): void {
    const index = this.config.users.findIndex((u) => u.id === userId);
    if (index === -1) {
      throw new Error('Usuario no encontrado');
    }

    this.config.users.splice(index, 1);
    this.saveConfig();
  }

  /**
   * Obtiene todos los usuarios remotos (sin hashes de contraseña)
   */
  getRemoteUsers(): RemoteUser[] {
    return this.config.users.map((u) => ({
      ...u,
      passwordHash: '',
    }));
  }

  /**
   * Obtiene un usuario específico
   */
  getRemoteUser(userId: string): RemoteUser | null {
    const user = this.config.users.find((u) => u.id === userId);
    return user
      ? {
          ...user,
          passwordHash: '',
        }
      : null;
  }

  /**
   * Autentica un usuario remoto
   */
  async authenticateRemoteUser(username: string, password: string): Promise<RemoteLoginToken> {
    const user = this.config.users.find((u) => u.username === username);
    if (!user) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    if (!user.isActive) {
      throw new Error('Usuario desactivado');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    // Actualiza último acceso
    user.lastAccess = Date.now();
    this.saveConfig();

    // Genera token JWT
    return this.generateToken(user);
  }

  /**
   * Genera un token JWT para un usuario
   */
  private generateToken(user: RemoteUser): RemoteLoginToken {
    const token: RemoteLoginToken = {
      userId: user.id,
      username: user.username,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.JWT_EXPIRY,
    };

    return token;
  }

  /**
   * Crea el JWT encoded
   */
  createJWT(user: RemoteUser): string {
    const token = this.generateToken(user);
    return jwt.sign(token, this.config.secret, { algorithm: 'HS256' });
  }

  /**
   * Verifica y decodifica un JWT
   */
  verifyJWT(token: string): RemoteLoginToken {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        algorithms: ['HS256'],
      }) as RemoteLoginToken;
      return decoded;
    } catch (error: any) {
      throw new Error('Token inválido: ' + error.message);
    }
  }

  /**
   * Cambia la contraseña de un usuario
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
    }

    const user = this.config.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    this.saveConfig();
  }

  /**
   * Genera un ID único
   */
  private generateId(): string {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Obtiene estadísticas de acceso remoto
   */
  getStatistics() {
    return {
      totalUsers: this.config.users.length,
      activeUsers: this.config.users.filter((u) => u.isActive).length,
      lastSecret: this.config.secret.substring(0, 4) + '*'.repeat(this.config.secret.length - 8) + this.config.secret.substring(this.config.secret.length - 4),
    };
  }

  /**
   * Resetea el secreto JWT (invalida todos los tokens)
   */
  resetSecret(): string {
    this.config.secret = this.generateSecret();
    this.saveConfig();
    return this.config.secret;
  }
}

export default RemoteAccessManager;
