import React, { useState, useEffect } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import { io, Socket } from 'socket.io-client';
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
  const [isRemoteSession, setIsRemoteSession] = useState(false);
  const [remoteSocket, setRemoteSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Verificar si hay sesión remota activa
    const remoteSessionStr = localStorage.getItem('remoteSession');
    if (remoteSessionStr) {
      try {
        const remoteSession = JSON.parse(remoteSessionStr);
        const sessionAge = Date.now() - remoteSession.timestamp;
        if (sessionAge < 24 * 60 * 60 * 1000 && remoteSession.token) {
          console.log('[MainPage] Remote session active');
          setIsRemoteSession(true);
          setCurrentUser(remoteSession.userData || { username: 'Remote User' });
          
          // Crear conexión socket remota persistente
          console.log('[MainPage] Connecting to remote server:', remoteSession.connectionString);
          const socket = io(remoteSession.connectionString, {
            auth: { token: remoteSession.token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
          });

          socket.on('connect', () => {
            console.log('[MainPage] Connected to remote server');
          });

          socket.on('disconnect', (reason) => {
            console.log('[MainPage] Disconnected from remote server:', reason);
          });

          socket.on('connect_error', (error) => {
            console.error('[MainPage] Connection error:', error);
          });

          setRemoteSocket(socket);

          // Cleanup al desmontar
          return () => {
            console.log('[MainPage] Cleaning up remote socket connection');
            socket.disconnect();
          };
        }
      } catch (e) {
        console.error('[MainPage] Invalid remote session:', e);
      }
    }

    // Si no hay sesión remota, cargar usuario local y ruta del servidor
    if (!remoteSessionStr) {
      window.electron.auth.getCurrentUser().then(user => {
        setCurrentUser(user);
      });
      
      window.electron.server.getPath().then(path => {
        setServerPath(path);
      }).catch(err => {
        console.error('Error loading server path:', err);
      });
    }
  }, []);

  // Recargar la ruta del servidor cuando se cambia de panel (especialmente para File Manager)
  useEffect(() => {
    // Solo recargar si NO es sesión remota
    if (!isRemoteSession) {
      window.electron.server.getPath().then(path => {
        setServerPath(path);
      }).catch(err => {
        console.error('Error reloading server path:', err);
      });
    }
  }, [currentPanel, isRemoteSession]);

  const handleLogout = async () => {
    // Si es sesión remota, solo limpiar localStorage
    if (isRemoteSession) {
      localStorage.removeItem('remoteSession');
    } else {
      await window.electron.auth.logout();
    }
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
            <span className="user-icon">{isRemoteSession ? '🌐' : '👤'}</span>
            <div className="user-info">
              <span className="user-label">
                {isRemoteSession ? 'Conexión Remota' : I18nManager.t('auth.current_user')}
              </span>
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
            <ServerControlPanel 
              serverPath={serverPath || undefined}
              isRemoteMode={isRemoteSession}
              remoteSocket={remoteSocket}
            />
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
