import React, { useState } from 'react';
import { I18nManager, Language } from '../../shared/i18n/I18nManager';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

/**
 * Selector de idiomas con banderas
 */
export default function LanguageSelector({
  currentLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const languages = I18nManager.getAvailableLanguages();

  // Mapear códigos de idioma a nombres de archivos de bandera
  const flagMap: Record<string, string> = {
    es: 'es',
    pt: 'pt',
    en: 'gb',
    de: 'de',
    fr: 'fr',
    zh: 'cn',
    jp: 'jp',
    kr: 'kr',
  };

  return (
    <div className="auth-language-selector">
      {languages.map(lang => (
        <button
          key={lang.code}
          className={`auth-language-btn ${currentLanguage === lang.code ? 'active' : ''}`}
          onClick={() => onLanguageChange(lang.code as Language)}
          title={lang.name}
        >
          <img
            src={`/resources/assets/${flagMap[lang.code]}.webp`}
            alt={lang.name}
            draggable={false}
          />
        </button>
      ))}
    </div>
  );
}
