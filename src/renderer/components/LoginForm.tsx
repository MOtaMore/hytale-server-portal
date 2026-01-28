import React, { useState } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';

interface LoginFormProps {
  onSuccess: () => void;
}

/**
 * Formulario de login para cuenta local existente
 */
export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError(I18nManager.t('auth.username_required'));
      return;
    }

    if (!password) {
      setError(I18nManager.t('auth.password_required'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electron.auth.login({
        username: username.trim(),
        password,
      });

      if (result.success) {
        setUsername('');
        setPassword('');
        onSuccess();
      } else {
        setError(result.error || I18nManager.t('auth.login_error'));
      }
    } catch (err) {
      setError(I18nManager.t('auth.login_error'));
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="local-account-setup">
      <h2 className="setup-title">
        {I18nManager.t('auth.login_title')}
      </h2>
      <p className="setup-subtitle">
        {I18nManager.t('auth.login_subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="setup-form">
        {/* Username Field */}
        <div className="form-group">
          <label htmlFor="login-username" className="form-label">
            {I18nManager.t('auth.username')}
          </label>
          <input
            type="text"
            id="login-username"
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
          <label htmlFor="login-password" className="form-label">
            {I18nManager.t('auth.password')}
          </label>
          <input
            type="password"
            id="login-password"
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
            : I18nManager.t('auth.login_button')}
        </button>
      </form>
    </div>
  );
}
