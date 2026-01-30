import React, { useState, useEffect } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import { Socket } from 'socket.io-client';
import './DiscordPanel.css';

interface DiscordConfig {
  enabled: boolean;
  botToken: string;
  channelId: string;
  messageOnline: string;
  messageOffline: string;
  channelNameOnline: string;
  channelNameOffline: string;
}

export const DiscordPanel: React.FC<{isRemoteMode?: boolean, remoteSocket?: Socket | null}> = ({ isRemoteMode = false, remoteSocket = null }) => {
  const [config, setConfig] = useState<DiscordConfig>({
    enabled: false,
    botToken: '',
    channelId: '',
    messageOnline: '✅ Servidor Hytale está en línea',
    messageOffline: '❌ Servidor Hytale está fuera de línea',
    channelNameOnline: '🟢-servidor-online',
    channelNameOffline: '🔴-servidor-offline',
  });
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const result = await window.electron.discord.getConfig();
      setConfig(result);
      setStatusMessage('');
    } catch (error) {
      console.error('Error cargando configuración de Discord:', error);
      setStatusMessage(`${I18nManager.t('common.error')}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await window.electron.discord.saveConfig(config);
      setStatusMessage(I18nManager.t('discord.saved'));
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage(`${I18nManager.t('common.error')}: ${error}`);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setStatusMessage('Enviando mensaje de prueba...');
      const result = (await window.electron.discord.test()) as any;
      setStatusMessage(result?.message || (result ? 'Conexión exitosa' : 'Conexión fallida'));
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error) {
      setStatusMessage(`${I18nManager.t('common.error')}: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="discord-panel loading">{I18nManager.t('common.loading')}</div>;
  }

  return (
    <div className="discord-panel">
      <div className="discord-header">
        <h2>💬 {I18nManager.t('discord.title')}</h2>
      </div>

      {statusMessage && (
        <div className={`status-message ${statusMessage.includes('Error') || statusMessage.includes('error') ? 'error' : 'success'}`}>
          {statusMessage}
        </div>
      )}

      <div className="discord-form">
        <div className="form-group toggle-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">{I18nManager.t('discord.enable')}</span>
          </label>
        </div>

        <div className="form-group">
          <label>{I18nManager.t('discord.bot_token')}</label>
          <input
            type="password"
            value={config.botToken}
            onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
            placeholder="Tu token de bot de Discord aquí"
            className="form-input"
            disabled={!config.enabled}
          />
          <div className="help-text">Token del bot de Discord (mantén esto en secreto)</div>
        </div>

        <div className="form-group">
          <label>{I18nManager.t('discord.channel_id')}</label>
          <input
            type="text"
            value={config.channelId}
            onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
            placeholder="1234567890123456789"
            className="form-input"
            disabled={!config.enabled}
          />
          <div className="help-text">ID del canal donde se enviarán las notificaciones</div>
        </div>

        <div className="form-section">
          <h3>📨 Mensajes de Notificación</h3>
          
          <div className="form-group">
            <label>{I18nManager.t('discord.message_online')}</label>
            <input
              type="text"
              value={config.messageOnline}
              onChange={(e) => setConfig({ ...config, messageOnline: e.target.value })}
              placeholder="✅ Servidor está en línea"
              className="form-input"
              disabled={!config.enabled}
            />
            <div className="help-text">Mensaje cuando el servidor se inicia</div>
          </div>

          <div className="form-group">
            <label>{I18nManager.t('discord.message_offline')}</label>
            <input
              type="text"
              value={config.messageOffline}
              onChange={(e) => setConfig({ ...config, messageOffline: e.target.value })}
              placeholder="❌ Servidor está fuera de línea"
              className="form-input"
              disabled={!config.enabled}
            />
            <div className="help-text">Mensaje cuando el servidor se detiene</div>
          </div>
        </div>

        <div className="form-section">
          <h3>🏷️ Nombres del Canal</h3>
          
          <div className="form-group">
            <label>{I18nManager.t('discord.channel_name_online')}</label>
            <input
              type="text"
              value={config.channelNameOnline}
              onChange={(e) => setConfig({ ...config, channelNameOnline: e.target.value })}
              placeholder="🟢-servidor-online"
              className="form-input"
              disabled={!config.enabled}
            />
            <div className="help-text">Nombre del canal cuando el servidor está activo</div>
          </div>

          <div className="form-group">
            <label>{I18nManager.t('discord.channel_name_offline')}</label>
            <input
              type="text"
              value={config.channelNameOffline}
              onChange={(e) => setConfig({ ...config, channelNameOffline: e.target.value })}
              placeholder="🔴-servidor-offline"
              className="form-input"
              disabled={!config.enabled}
            />
            <div className="help-text">Nombre del canal cuando el servidor está inactivo</div>
          </div>
        </div>

        <div className="discord-actions">
          <button 
            className="btn-save" 
            onClick={handleSaveConfig}
            disabled={!config.enabled}
          >
            💾 {I18nManager.t('common.save')}
          </button>
          <button 
            className="btn-test" 
            onClick={handleTestConnection}
            disabled={!config.enabled || !config.botToken || !config.channelId || testing}
          >
            🧪 {I18nManager.t('discord.test')}
          </button>
        </div>
      </div>
    </div>
  );
};
