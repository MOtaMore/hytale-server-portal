import { EncryptionManager } from './EncryptionManager';
import { SecureStorageManager, UserAccount } from './SecureStorageManager';

/**
 * Gestor de autenticación de usuarios
 * Responsable de validar credenciales y mantener sesiones
 */
export class AuthenticationManager {
  /**
   * Crea una nueva cuenta de usuario
   * @throws Error si el usuario ya existe
   */
  static createAccount(username: string, email: string, password: string): UserAccount {
    // Validar que no exista usuario previo
    const existingUser = SecureStorageManager.getUser();
    if (existingUser) {
      throw new Error('User account already exists. Please logout first.');
    }

    // Validar credenciales
    this.validateCredentials(username, email, password);

    // Crear el usuario con contraseña hasheada
    const user: UserAccount = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: EncryptionManager.hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    // Guardar usuario
    SecureStorageManager.saveUser(user);

    return {
      ...user,
      passwordHash: '', // No devolver el hash
    };
  }

  /**
   * Valida las credenciales del usuario
   */
  static login(username: string, password: string): UserAccount {
    const user = SecureStorageManager.getUser();

    if (!user) {
      throw new Error('No account found. Please create one first.');
    }

    if (user.username.toLowerCase() !== username.toLowerCase()) {
      throw new Error('Invalid username.');
    }

    if (!EncryptionManager.verifyPassword(password, user.passwordHash)) {
      throw new Error('Invalid password.');
    }

    return {
      ...user,
      passwordHash: '', // No devolver el hash
    };
  }

  /**
   * Obtiene el usuario actual (si hay sesión activa)
   */
  static getCurrentUser(): UserAccount | null {
    const user = SecureStorageManager.getUser();
    if (user) {
      return {
        ...user,
        passwordHash: '',
      };
    }
    return null;
  }

  /**
   * Cierra la sesión actual (pero mantiene las credenciales guardadas)
   * Esto permite que el usuario vea el login nuevamente
   */
  static logout(): void {
    // NO limpiamos el usuario - solo cerramos la sesión
    // El usuario sigue existiendo en el almacenamiento para que pueda hacer login
  }

  /**
   * Cambia la contraseña del usuario
   */
  static changePassword(currentPassword: string, newPassword: string): void {
    const user = SecureStorageManager.getUser();

    if (!user) {
      throw new Error('No account found.');
    }

    // Verificar contraseña actual
    if (!EncryptionManager.verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error('Current password is incorrect.');
    }

    // Validar nueva contraseña
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    // Actualizar contraseña
    user.passwordHash = EncryptionManager.hashPassword(newPassword);
    SecureStorageManager.saveUser(user);
  }

  /**
   * Valida que las credenciales cumplan con los requisitos
   */
  private static validateCredentials(username: string, email: string, password: string): void {
    if (!username || username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters long.');
    }

    if (!email || !this.isValidEmail(email)) {
      throw new Error('Invalid email format.');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
  }

  /**
   * Valida formato de email
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
