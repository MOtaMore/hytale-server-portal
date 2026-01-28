import React, { useState, useEffect } from 'react';
import { I18nManager, Language } from '../../shared/i18n/I18nManager';
import LanguageSelector from '../components/LanguageSelector';
import LocalAccountSetup from '../components/LocalAccountSetup';
import LoginForm from '../components/LoginForm';
import './AuthPage.css';

interface AuthPageProps {
  onAuthenticated: () => void;
}

/**
 * Página de autenticación - Fase 0
 * Incluye selector de idioma y creación de cuenta local o login
 */
export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('es');
  const [isLoading, setIsLoading] = useState(true);
  const [accountExists, setAccountExists] = useState(false);

  useEffect(() => {
    // Cargar el idioma guardado y verificar si existe cuenta
    Promise.all([
      window.electron.language.getLast(),
      window.electron.auth.hasAccount?.() || Promise.resolve(false)
    ]).then(([language, hasAccount]) => {
      I18nManager.setLanguage(language as Language);
      setCurrentLanguage(language as Language);
      setAccountExists(hasAccount || false);
      setIsLoading(false);
    });
  }, []);

  const handleLanguageChange = (language: Language) => {
    I18nManager.setLanguage(language);
    setCurrentLanguage(language);
  };

  const handleAuthenticated = () => {
    onAuthenticated();
  };

  if (isLoading) {
    return <div className="auth-loading">Cargando...</div>;
  }

  return (
    <div className="auth-page">
      {/* Background gradient */}
      <div className="auth-background">
        <div className="gradient-blob gradient-blob-1"></div>
        <div className="gradient-blob gradient-blob-2"></div>
      </div>

      {/* Content */}
      <div className="auth-container">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">
            {I18nManager.t('app.title')}
          </h1>
          <p className="auth-tagline">
            {I18nManager.t('app.tagline')}
          </p>
        </div>

        {/* Language Selector */}
        <LanguageSelector
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
        />

        {/* Authentication Form Container */}
        <div className="auth-form-container">
          {accountExists ? (
            <LoginForm onSuccess={handleAuthenticated} />
          ) : (
            <LocalAccountSetup onSuccess={handleAuthenticated} />
          )}
        </div>
      </div>
    </div>
  );
}
