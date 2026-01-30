import React, { useState } from 'react';
import { EncryptionManager } from '../../shared/utils/EncryptionManager';
import { I18nManager } from '../../shared/i18n/I18nManager';

interface LocalAccountSetupProps {
  onSuccess: () => void;
}

/**
 * Componente para crear la cuenta local en la primera ejecución
 */
export default function LocalAccountSetup({ onSuccess }: LocalAccountSetupProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!username.trim()) {
      setError(I18nManager.t('auth.username_required'));
      return false;
    }
    if (username.trim().length < 3) {
      setError(I18nManager.t('auth.username_min_length'));
      return false;
    }
    if (!password) {
      setError(I18nManager.t('auth.password_required'));
      return false;
    }
    if (password.length < 6) {
      setError(I18nManager.t('auth.password_min_length'));
      return false;
    }
    if (password !== confirmPassword) {
      setError(I18nManager.t('auth.passwords_mismatch'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Send plain password - backend will hash it properly
      const result = await window.electron.auth.register({
        username: username.trim(),
        password: password, // Plain text password - backend handles hashing
      });

      // Save session token to localStorage
      if (result.token) {
        localStorage.setItem('localSession', JSON.stringify({
          token: result.token,
          username: result.user?.username,
          timestamp: Date.now(),
        }));
      }

      // Limpiar formulario
      setUsername('');
      setPassword('');
      setConfirmPassword('');

      onSuccess();
    } catch (err) {
      setError(I18nManager.t('auth.registration_error'));
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="local-account-setup">
      <h2 className="setup-title">
        {I18nManager.t('auth.create_local_account')}
      </h2>
      <p className="setup-subtitle">
        {I18nManager.t('auth.local_account_description')}
      </p>

      <form onSubmit={handleSubmit} className="setup-form">
        {/* Username Field */}
        <div className="form-group">
          <label htmlFor="username" className="form-label">
            {I18nManager.t('auth.username')}
          </label>
          <input
            type="text"
            id="username"
            className="form-input"
            placeholder={I18nManager.t('auth.username_placeholder')}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            disabled={isLoading}
            required
          />
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            {I18nManager.t('auth.password')}
          </label>
          <input
            type="password"
            id="password"
            className="form-input"
            placeholder={I18nManager.t('auth.password_placeholder')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            disabled={isLoading}
            required
          />
        </div>

        {/* Confirm Password Field */}
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            {I18nManager.t('auth.confirm_password')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            className="form-input"
            placeholder={I18nManager.t('auth.confirm_password_placeholder')}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            disabled={isLoading}
            required
          />
        </div>

        {/* Error Message */}
        {error && <div className="form-error">{error}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          className="form-submit"
          disabled={isLoading}
        >
          {isLoading
            ? I18nManager.t('common.loading')
            : I18nManager.t('auth.create_account')}
        </button>
      </form>
    </div>
  );
}
