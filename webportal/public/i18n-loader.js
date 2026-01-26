// ============================================
// ============ INTERNATIONALIZATION (i18n) ============
// Loads translations from separate JSON files
// ============================================

class I18n {
  constructor() {
    this.currentLanguage = localStorage.getItem('appLanguage') || 'en';
    this.translations = {};
    this.supportedLanguages = ['es', 'en', 'pt', 'fr', 'zh', 'jp', 'kr', 'de'];
    this.loaded = false;
  }

  // Load all translation files for supported languages
  async loadTranslations() {
    try {
      for (const lang of this.supportedLanguages) {
        const response = await fetch(`/translations/${lang}.json`);
        if (!response.ok) {
          console.error(`Failed to load ${lang}.json`);
          continue;
        }
        this.translations[lang] = await response.json();
      }
      this.loaded = true;
      console.log('✓ Translations loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading translations:', error);
      return false;
    }
  }

  // Get translation for a specific key
  t(key, defaultValue = key) {
    if (!this.loaded) {
      console.warn(`i18n not loaded yet, returning key: ${key}`);
      return defaultValue;
    }

    const translation = this.translations[this.currentLanguage]?.[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key} in language: ${this.currentLanguage}`);
      return defaultValue;
    }
    return translation;
  }

  // Change current language and update UI
  setLanguage(lang) {
    if (!this.supportedLanguages.includes(lang)) {
      console.error(`Language ${lang} is not supported`);
      return false;
    }
    this.currentLanguage = lang;
    localStorage.setItem('appLanguage', lang);
    this.updateUI();
    return true;
  }

  // Get the currently active language
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Update UI elements with new language translations
  updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });

    document.querySelectorAll('[data-i18n-value]').forEach(element => {
      const key = element.getAttribute('data-i18n-value');
      element.value = this.t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
  }

  // Retrieve all translation keys for a specific language
  getAllTranslations(lang = this.currentLanguage) {
    return this.translations[lang] || {};
  }
}

// Global i18n instance accessible to all scripts
const i18n = new I18n();

// Initialize i18n on script load
async function initI18n() {
  await i18n.loadTranslations();
  i18n.updateUI();
  
  // Fire custom event when translations are ready
  window.dispatchEvent(new Event('i18n-ready'));
  console.log('✓ i18n initialized and event fired');
}

// Initialize when DOM content is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  // DOM already loaded, initialize immediately
  initI18n();
}
