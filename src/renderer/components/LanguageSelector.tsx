import React, { useState, useEffect } from 'react';
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
  const [flagPaths, setFlagPaths] = useState<Record<string, string>>({});

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

  useEffect(() => {
    // Cargar las rutas de las banderas de manera asíncrona
    const loadFlagPaths = async () => {
      const paths: Record<string, string> = {};
      for (const lang of languages) {
        try {
          const flagPath = await window.electron.app.getResourcePath(`assets/${flagMap[lang.code]}.webp`);
          paths[lang.code] = `file://${flagPath}`;
        } catch (error) {
          console.error(`Error loading flag for ${lang.code}:`, error);
        }
      }
      setFlagPaths(paths);
    };
    loadFlagPaths();
  }, []);

  return (
    <div className="auth-language-selector">
      {languages.map(lang => (
        <button
          key={lang.code}
          className={`auth-language-btn ${currentLanguage === lang.code ? 'active' : ''}`}
          onClick={() => onLanguageChange(lang.code as Language)}
          title={lang.name}
        >
          {flagPaths[lang.code] ? (
            <img
              src={flagPaths[lang.code]}
              alt={lang.name}
              draggable={false}
            />
          ) : (
            <span>{lang.code.toUpperCase()}</span>
          )}
        </button>
      ))}
    </div>
  );
}
