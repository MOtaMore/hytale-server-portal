import React, { useState } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';

interface RegisterFormProps {
  onSuccess: () => void;
}

/**
 * Formulario de registro
 */
export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validar campos
    if (!username.trim()) {
      setError(I18nManager.t('auth.error_username_required'));
      return;
    }

    if (username.trim().length < 3) {
      setError(I18nManager.t('auth.error_username_required'));
      return;
    }

    if (!email.trim()) {
      setError(I18nManager.t('auth.error_email_required'));
      return;
    }

    if (!validateEmail(email)) {
      setError(I18nManager.t('auth.error_invalid_email'));
      return;
    }

    if (!password) {
      setError(I18nManager.t('auth.error_password_required'));
      return;
    }

    if (password.length < 6) {
      setError(I18nManager.t('auth.error_password_too_short'));
      return;
    }

    if (password !== passwordConfirm) {
      setError(I18nManager.t('auth.error_password_mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electron.auth.createAccount(username, email, password);

      if (result.success) {
        setSuccess(I18nManager.t('auth.success_account_created'));
        setTimeout(() => onSuccess(), 1500);
      } else {
        setError(result.error || I18nManager.t('common.error'));
      }
    } catch (err: any) {
      setError(err.message || I18nManager.t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="auth-form-title">{I18nManager.t('auth.register_title')}</h2>

      {error && <div className="auth-form-error">{error}</div>}
      {success && <div className="auth-form-success">{success}</div>}

      <div className="form-group">
        <label>{I18nManager.t('auth.username')}</label>
        <input
          type="text"
          placeholder={I18nManager.t('auth.username')}
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label>{I18nManager.t('auth.email')}</label>
        <input
          type="email"
          placeholder={I18nManager.t('auth.email')}
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label>{I18nManager.t('auth.password')}</label>
        <input
          type="password"
          placeholder={I18nManager.t('auth.password')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label>{I18nManager.t('auth.password_confirm')}</label>
        <input
          type="password"
          placeholder={I18nManager.t('auth.password_confirm')}
          value={passwordConfirm}
          onChange={e => setPasswordConfirm(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        className="auth-form-submit"
        disabled={isLoading}
      >
        {isLoading ? I18nManager.t('common.loading') : I18nManager.t('auth.register_button')}
      </button>
    </form>
  );
}
