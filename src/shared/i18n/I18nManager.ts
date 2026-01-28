import translations from './translations.json';

export type Language = 'es' | 'pt' | 'en' | 'de' | 'fr' | 'zh' | 'jp' | 'kr';

/**
 * Gestor centralizado de internacionalización (i18n)
 * Maneja la traducción de strings y el cambio de idioma
 */
export class I18nManager {
  private static currentLanguage: Language = 'es';
  private static listeners: Set<(lang: Language) => void> = new Set();

  /**
   * Obtiene el idioma actual
   */
  static getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Cambia el idioma actual
   */
  static setLanguage(language: Language): void {
    if (this.isValidLanguage(language)) {
      this.currentLanguage = language;
      this.notifyListeners();
    }
  }

  /**
   * Obtiene una traducción
   * @param key Ruta de la clave de traducción separada por puntos (ej: 'auth.login_title')
   * @param defaultValue Valor por defecto si la clave no existe
   */
  static t(key: string, defaultValue: string = key): string {
    const keys = key.split('.');
    let current: any = translations[this.currentLanguage];

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }

    return typeof current === 'string' ? current : defaultValue;
  }

  /**
   * Obtiene todas las traducciones del idioma actual
   */
  static getAllTranslations() {
    return translations[this.currentLanguage];
  }

  /**
   * Obtiene la lista de idiomas disponibles
   */
  static getAvailableLanguages(): { code: Language; name: string }[] {
    return [
      { code: 'es', name: 'Español' },
      { code: 'pt', name: 'Português' },
      { code: 'en', name: 'English' },
      { code: 'de', name: 'Deutsch' },
      { code: 'fr', name: 'Français' },
      { code: 'zh', name: '中文' },
      { code: 'jp', name: '日本語' },
      { code: 'kr', name: '한국어' },
    ];
  }

  /**
   * Verifica si un idioma es válido
   */
  private static isValidLanguage(language: string): language is Language {
    return ['es', 'pt', 'en', 'de', 'fr', 'zh', 'jp', 'kr'].includes(language);
  }

  /**
   * Suscribe un listener a cambios de idioma
   */
  static onLanguageChange(callback: (lang: Language) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifica a todos los listeners sobre cambios de idioma
   */
  private static notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentLanguage));
  }
}
