/**
 * RemoteLoginForm - Formulario de login para conexiones remotas
 * Permite conectarse a otro servidor usando IP:Puerto o URL de túnel
 */

import React, { useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { I18nManager } from '../../shared/i18n/I18nManager';
import './RemoteLoginForm.css';

interface RemoteLoginFormProps {
  onSuccess: () => void;
}

export default function RemoteLoginForm({ onSuccess }: RemoteLoginFormProps) {
  const t = I18nManager.t.bind(I18nManager);
  const [connectionMethod, setConnectionMethod] = useState<'ip' | 'tunnel'>('ip');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState('9999');
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let socket: Socket | null = null;

    try {
      // Validación
      if (connectionMethod === 'ip') {
        if (!ipAddress || !port) {
          throw new Error(t('remote.error_ip_required'));
        }
        // Validación básica de IP
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
        if (!ipRegex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
          throw new Error(t('remote.error_invalid_ip'));
        }
        if (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535) {
          throw new Error(t('remote.error_invalid_port'));
        }
      } else {
        if (!tunnelUrl) {
          throw new Error(t('remote.error_tunnel_required'));
        }
        // Validación de URL
        try {
          new URL(tunnelUrl);
        } catch {
          throw new Error(t('remote.error_invalid_url'));
        }
      }

      if (!username || !password) {
        throw new Error(t('remote.error_credentials_required'));
      }

      // Construir la URL de conexión
      const connectionString = connectionMethod === 'ip' 
        ? `http://${ipAddress}:${port}` 
        : tunnelUrl;

      console.log('[RemoteLoginForm] Attempting connection to:', connectionString);

      // Crear conexión Socket.io sin token (para login)
      socket = io(connectionString, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false,
        autoConnect: false, // No conectar automáticamente
      });

      // Agregar listeners de error detallados
      socket.on('error', (error: any) => {
        console.error('[RemoteLoginForm] Socket error:', error);
      });

      socket.on('connect_error', (error: any) => {
        console.error('[RemoteLoginForm] Connect error:', error.message, error);
      });

      socket.on('connect_timeout', () => {
        console.error('[RemoteLoginForm] Connection timeout');
      });

      // Conectar manualmente
      socket.connect();

      // Esperar a que se conecte
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (socket) {
            socket.disconnect();
          }
          reject(new Error('Tiempo de espera agotado. Verifica que el servidor remoto esté funcionando y sea accesible.'));
        }, 10000);

        socket!.once('connect', () => {
          clearTimeout(timeout);
          console.log('[RemoteLoginForm] Socket connected successfully');
          resolve();
        });

        socket!.once('connect_error', (error: any) => {
          clearTimeout(timeout);
          let errorMsg = 'Error de conexión: ';
          
          if (error.message.includes('ECONNREFUSED')) {
            errorMsg += 'No se pudo conectar al servidor. Verifica la IP y el puerto.';
          } else if (error.message.includes('ETIMEDOUT')) {
            errorMsg += 'Tiempo de espera agotado. El servidor no responde.';
          } else if (error.message.includes('ENETUNREACH')) {
            errorMsg += 'Red inalcanzable. Verifica tu conexión de red.';
          } else if (error.message.includes('EHOSTUNREACH')) {
            errorMsg += 'Host inalcanzable. Verifica la dirección IP.';
          } else {
            errorMsg += error.message || 'Error desconocido';
          }
          
          reject(new Error(errorMsg));
        });
      });

      // Enviar credenciales para autenticación
      const result = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(t('remote.error_auth_timeout') || 'Authentication timeout'));
        }, 5000);

        socket!.emit('auth:login', { username, password }, (response: any) => {
          clearTimeout(timeout);
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || t('remote.error_auth_failed')));
          }
        });
      });

      // Desconectar socket temporal
      socket.disconnect();

      // Guardar la sesión remota
      localStorage.setItem('remoteSession', JSON.stringify({
        connectionString,
        token: result.token,
        userData: result.userData,
        timestamp: Date.now(),
      }));

      console.log('[RemoteLoginForm] Login successful');
      onSuccess();
    } catch (err: any) {
      console.error('[RemoteLoginForm] Login error:', err);
      if (socket) {
        socket.disconnect();
      }
      setError(err.message || t('remote.error_connection'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="auth-form-title">🌐 {t('remote.login_remote')}</h2>
      <p className="auth-form-subtitle">
        {t('remote.login_subtitle')}
      </p>

      {error && <div className="auth-form-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Selector de método de conexión */}
        <div className="connection-method-selector">
          <button
            type="button"
            className={`method-btn ${connectionMethod === 'ip' ? 'active' : ''}`}
            onClick={() => setConnectionMethod('ip')}
          >
            📡 {t('remote.method_ip_direct')}
          </button>
          <button
            type="button"
            className={`method-btn ${connectionMethod === 'tunnel' ? 'active' : ''}`}
            onClick={() => setConnectionMethod('tunnel')}
          >
            🔗 {t('remote.method_tunnel_direct')}
          </button>
        </div>

        {/* Campos según método */}
        {connectionMethod === 'ip' ? (
          <div className="connection-fields">
            <div className="form-group">
              <label>{t('remote.ip_address')}</label>
              <input
                type="text"
                placeholder={t('remote.ip_placeholder')}
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('remote.port')}</label>
              <input
                type="text"
                placeholder={t('remote.port_placeholder')}
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
        ) : (
          <div className="connection-fields">
            <div className="form-group">
              <label>{t('remote.tunnel_url_label')}</label>
              <input
                type="text"
                placeholder={t('remote.tunnel_placeholder_login')}
                value={tunnelUrl}
                onChange={(e) => setTunnelUrl(e.target.value)}
                disabled={loading}
                required
              />
              <small className="help-text">
                {t('remote.tunnel_help')}
              </small>
            </div>
          </div>
        )}

        {/* Credenciales */}
        <div className="credentials-section">
          <h3>{t('remote.credentials_title')}</h3>
          <div className="form-group">
            <label>{t('remote.username_label')}</label>
            <input
              type="text"
              placeholder={t('remote.username_placeholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>{t('remote.password_label')}</label>
            <input
              type="password"
              placeholder={t('remote.password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="remote-warning-box" style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffc107', 
          borderRadius: '4px', 
          padding: '12px', 
          marginBottom: '15px',
          fontSize: '13px'
        }}>
          <strong>⚠️ Antes de conectar, verifica:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>El servidor remoto tiene el acceso remoto <strong>HABILITADO</strong></li>
            <li>El servidor Socket.io está <strong>CORRIENDO</strong> en el puerto {connectionMethod === 'ip' ? port : '9999'}</li>
            <li>No hay firewall bloqueando la conexión</li>
            <li>La IP/URL es correcta y accesible desde tu red</li>
          </ul>
        </div>

        <button
          type="submit"
          className="auth-form-submit"
          disabled={loading}
        >
          {loading ? t('remote.connecting') : t('remote.connect_button')}
        </button>

        <div className="remote-info-box">
          <strong>ℹ️ {t('remote.connection_info')}:</strong>
          <ul>
            <li>{t('remote.info_credentials')}</li>
            <li>{t('remote.info_admin')}</li>
            <li>{t('remote.info_expiry')}</li>
          </ul>
        </div>
      </form>
    </>
  );
}
