import React, { useState, useEffect } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import ServerControlPanel from '../components/ServerControlPanel';
import DownloadManager from '../components/DownloadManager';
import FileManager from '../components/FileManager';
import { BackupPanel } from '../components/BackupPanel';
import { ConfigPanel } from '../components/ConfigPanel';
import { DiscordPanel } from '../components/DiscordPanel';
import RemoteAccessPanel from '../components/RemoteAccessPanel';
import './MainPage.css';

interface MainPageProps {
  onLogout: () => void;
}

/**
 * Página principal - estructura de navegación
 * Aquí se añadirán los paneles de cada fase
 */
export default function MainPage({ onLogout }: MainPageProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPanel, setCurrentPanel] = useState<'server' | 'download' | 'files' | 'backup' | 'config' | 'discord' | 'remote'>('server');
  const [serverPath, setServerPath] = useState<string | null>(null);

  useEffect(() => {
    // Cargar usuario actual y ruta del servidor
    window.electron.auth.getCurrentUser().then(user => {
      setCurrentUser(user);
    });
    
    window.electron.server.getPath().then(path => {
      setServerPath(path);
    }).catch(err => {
      console.error('Error loading server path:', err);
    });
  }, []);

  // Recargar la ruta del servidor cuando se cambia de panel (especialmente para File Manager)
  useEffect(() => {
    window.electron.server.getPath().then(path => {
      setServerPath(path);
    }).catch(err => {
      console.error('Error reloading server path:', err);
    });
  }, [currentPanel]);

  const handleLogout = async () => {
    await window.electron.auth.logout();
    onLogout();
  };

  return (
    <div className="main-page">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">{I18nManager.t('app.title')}</h1>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentPanel === 'server' ? 'active' : ''}`}
            onClick={() => setCurrentPanel('server')}
          >
            🖥️ {I18nManager.t('server.title')}
          </button>
          <button
            className={`nav-item ${currentPanel === 'download' ? 'active' : ''}`}
            onClick={() => setCurrentPanel('download')}
          >
            ⬇️ {I18nManager.t('download.title')}
          </button>
          <button
            className={`nav-item ${currentPanel === 'files' ? 'active' : ''}`}
            onClick={() => setCurrentPanel('files')}
          >
            📁 {I18nManager.t('files.title')}
          </button>
          <button
            className={`nav-item ${currentPanel === 'backup' ? 'active' : ''}`}
            onClick={() => setCurrentPanel('backup')}
          >
            💾 {I18nManager.t('backup.title')}
          </button>
          <button
            className={`nav-item ${currentPanel === 'config' ? 'active' : ''}`}
            onClick={() => setCurrentPanel('config')}
          >
            ⚙️ {I18nManager.t('config.title')}
          </button>
          <button
            className={`nav-item ${currentPanel === 'discord' ? 'active' : ''}`}
            onClick={() => setCurrentPanel('discord')}
          >
            💬 {I18nManager.t('discord.title')}
          </button>
          <button
            className={`nav-item ${currentPanel === 'remote' ? 'active' : ''}`}
            onClick={() => setCurrentPanel('remote')}
          >
            🌐 Acceso Remoto
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="current-user">
            <span className="user-icon">👤</span>
            <div className="user-info">
              <span className="user-label">{I18nManager.t('auth.current_user')}</span>
              <span className="user-name">{currentUser?.username || 'User'}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            {I18nManager.t('auth.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-panel">
          {currentPanel === 'server' && (
            <ServerControlPanel serverPath={serverPath || undefined} />
          )}
          {currentPanel === 'download' && (
            <DownloadManager onComplete={() => alert('Download completed!')} />
          )}
          {currentPanel === 'files' && (
            <FileManager serverPath={serverPath} />
          )}
          {currentPanel === 'backup' && (
            <BackupPanel />
          )}
          {currentPanel === 'config' && (
            <ConfigPanel />
          )}
          {currentPanel === 'discord' && (
            <DiscordPanel />
          )}
          {currentPanel === 'remote' && (
            <RemoteAccessPanel t={I18nManager.t.bind(I18nManager)} />
          )}
        </div>
      </main>
    </div>
  );
}
