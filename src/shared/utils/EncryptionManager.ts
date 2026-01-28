import * as CryptoJS from 'crypto-js';

/**
 * Gestor centralizado de encriptación y almacenamiento seguro
 */
export class EncryptionManager {
  private static readonly SECRET_KEY = 'HytaleServerPortal2026_SecureKey';

  /**
   * Encripta un texto
   */
  static encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.SECRET_KEY).toString();
  }

  /**
   * Desencripta un texto
   */
  static decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Valida si un texto está correctamente encriptado y desencriptable
   */
  static isValidEncrypted(encryptedText: string): boolean {
    try {
      const decrypted = this.decrypt(encryptedText);
      return decrypted.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Hash SHA256 para verificar integridad
   */
  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password + this.SECRET_KEY).toString();
  }

  /**
   * Verifica si una contraseña coincide con su hash
   */
  static verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }
}
