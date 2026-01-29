/**
 * PermissionsManager - Gestión de permisos para usuarios remotos
 * Define qué acciones pueden realizar los usuarios en función de sus permisos
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'server' | 'config' | 'backup' | 'files' | 'discord';
}

export interface UserPermissions {
  userId: string;
  permissions: string[]; // array de permission IDs
}

export class PermissionsManager {
  private static instance: PermissionsManager;

  /**
   * Definición de permisos disponibles
   */
  private readonly PERMISSIONS: Permission[] = [
    // Permisos del Servidor
    {
      id: 'server.start',
      name: 'Iniciar Servidor',
      description: 'Permite iniciar el servidor Hytale',
      category: 'server',
    },
    {
      id: 'server.stop',
      name: 'Detener Servidor',
      description: 'Permite detener el servidor Hytale',
      category: 'server',
    },
    {
      id: 'server.restart',
      name: 'Reiniciar Servidor',
      description: 'Permite reiniciar el servidor Hytale',
      category: 'server',
    },
    {
      id: 'server.status',
      name: 'Ver Estado',
      description: 'Permite ver el estado del servidor',
      category: 'server',
    },
    {
      id: 'server.logs',
      name: 'Ver Logs',
      description: 'Permite ver los logs del servidor',
      category: 'server',
    },
    {
      id: 'server.command',
      name: 'Enviar Comandos',
      description: 'Permite enviar comandos al servidor',
      category: 'server',
    },

    // Permisos de Configuración
    {
      id: 'config.read',
      name: 'Leer Configuración',
      description: 'Permite leer la configuración del servidor (RAM, CPU)',
      category: 'config',
    },
    {
      id: 'config.write',
      name: 'Modificar Configuración',
      description: 'Permite modificar la configuración del servidor',
      category: 'config',
    },

    // Permisos de Backups
    {
      id: 'backup.create',
      name: 'Crear Backups',
      description: 'Permite crear copias de seguridad del servidor',
      category: 'backup',
    },
    {
      id: 'backup.restore',
      name: 'Restaurar Backups',
      description: 'Permite restaurar desde backups',
      category: 'backup',
    },
    {
      id: 'backup.delete',
      name: 'Eliminar Backups',
      description: 'Permite eliminar backups existentes',
      category: 'backup',
    },
    {
      id: 'backup.list',
      name: 'Listar Backups',
      description: 'Permite ver la lista de backups',
      category: 'backup',
    },

    // Permisos de Archivos
    {
      id: 'files.list',
      name: 'Listar Archivos',
      description: 'Permite listar archivos del servidor',
      category: 'files',
    },
    {
      id: 'files.read',
      name: 'Leer Archivos',
      description: 'Permite leer contenido de archivos',
      category: 'files',
    },
    {
      id: 'files.write',
      name: 'Modificar Archivos',
      description: 'Permite modificar archivos del servidor',
      category: 'files',
    },
    {
      id: 'files.upload',
      name: 'Subir Archivos',
      description: 'Permite subir archivos al servidor',
      category: 'files',
    },
    {
      id: 'files.delete',
      name: 'Eliminar Archivos',
      description: 'Permite eliminar archivos del servidor',
      category: 'files',
    },

    // Permisos de Discord
    {
      id: 'discord.config',
      name: 'Configurar Discord',
      description: 'Permite configurar la integración con Discord',
      category: 'discord',
    },
  ];

  private constructor() {}

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): PermissionsManager {
    if (!PermissionsManager.instance) {
      PermissionsManager.instance = new PermissionsManager();
    }
    return PermissionsManager.instance;
  }

  /**
   * Obtiene todos los permisos disponibles
   */
  getAllPermissions(): Permission[] {
    return [...this.PERMISSIONS];
  }

  /**
   * Obtiene permisos por categoría
   */
  getPermissionsByCategory(category: string): Permission[] {
    return this.PERMISSIONS.filter((p) => p.category === category);
  }

  /**
   * Valida si un usuario tiene un permiso específico
   */
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Valida si un usuario tiene TODOS los permisos requeridos
   */
  hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }

  /**
   * Valida si un usuario tiene AL MENOS UNO de los permisos requeridos
   */
  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some((perm) => userPermissions.includes(perm));
  }

  /**
   * Obtiene una descripción legible de los permisos de un usuario
   */
  getPermissionLabels(permissionIds: string[]): Permission[] {
    return this.PERMISSIONS.filter((p) => permissionIds.includes(p.id));
  }

  /**
   * Obtiene permisos predefinidos para roles comunes
   */
  getPresetPermissions(role: 'admin' | 'moderator' | 'viewer'): string[] {
    switch (role) {
      case 'admin':
        // Admin tiene todos los permisos
        return this.PERMISSIONS.map((p) => p.id);

      case 'moderator':
        // Moderator puede controlar servidor, ver config y backups
        return [
          'server.start',
          'server.stop',
          'server.restart',
          'server.status',
          'server.logs',
          'server.command',
          'config.read',
          'backup.create',
          'backup.list',
          'files.list',
          'files.read',
        ];

      case 'viewer':
        // Viewer solo puede ver estado, logs y enviar comandos
        return ['server.status', 'server.logs', 'server.command', 'config.read', 'backup.list', 'files.list'];

      default:
        return [];
    }
  }

  /**
   * Valida si un conjunto de permisos es válido
   */
  validatePermissions(permissionIds: string[]): boolean {
    const validIds = new Set(this.PERMISSIONS.map((p) => p.id));
    return permissionIds.every((perm) => validIds.has(perm));
  }
}

export default PermissionsManager.getInstance();
