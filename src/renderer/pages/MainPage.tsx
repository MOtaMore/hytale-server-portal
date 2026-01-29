import React, { useState, useEffect } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import { io, Socket } from 'socket.io-client';
import { sendRemoteCommand } from '../utils/remoteCommand';
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
  sessionType?: 'local' | 'remote' | null;
}

/**
 * Página principal - estructura de navegación
 * Aquí se añadirán los paneles de cada fase
 */
export default function MainPage({ onLogout, sessionType }: MainPageProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPanel, setCurrentPanel] = useState<'server' | 'download' | 'files' | 'backup' | 'config' | 'discord' | 'remote'>('server');
  const [serverPath, setServerPath] = useState<string | null>(null);
  const [isRemoteSession, setIsRemoteSession] = useState(sessionType === 'remote');
  const [remoteSocket, setRemoteSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Si la sesión es remota, cargar datos remota y crear socket
    if (sessionType === 'remote') {
      const remoteSessionStr = localStorage.getItem('remoteSession');
      if (!remoteSessionStr) {
        console.warn('[MainPage] Remote session expected but not found in localStorage');
        setIsRemoteSession(false);
        return;
      }

      try {
        const remoteSession = JSON.parse(remoteSessionStr);
        console.log('[MainPage] Remote session detected, loading remote user data');
        setIsRemoteSession(true);

        const resolvedUsername =
          remoteSession?.userData?.username ||
          remoteSession?.username ||
          remoteSession?.userData?.email ||
          remoteSession?.userData?.userId ||
          'Remote User';

        setCurrentUser({
          ...(remoteSession.userData || {}),
          username: resolvedUsername,
        });

        if (!remoteSession.token || !remoteSession.connectionString) {
          console.error('[MainPage] Remote session missing token or connectionString');
          return;
        }

        if (!remoteSocket) {
          // Crear conexión socket remota persistente
          console.log('[MainPage] Connecting to remote server:', remoteSession.connectionString);
          const socket = io(remoteSession.connectionString, {
            auth: { token: remoteSession.token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
          });

          setRemoteSocket(socket);
        }
      } catch (e) {
        console.error('[MainPage] Invalid remote session:', e);
      }
    } else if (sessionType === 'local') {
      // Si la sesión es local, cargar usuario local y ruta del servidor
      console.log('[MainPage] Local session detected, loading local user data');
      setIsRemoteSession(false);
      window.electron.auth.getCurrentUser().then(user => {
        setCurrentUser(user);
      });
      
      window.electron.server.getPath().then(path => {
        setServerPath(path);
      }).catch(err => {
        console.error('Error loading server path:', err);
      });
    }
  }, [sessionType, remoteSocket]);

  useEffect(() => {
    if (!remoteSocket) {
      return;
    }

    const onConnect = () => {
      console.log('[MainPage] Connected to remote server');
    };

    const onDisconnect = (reason: string) => {
      console.log('[MainPage] Disconnected from remote server:', reason);
    };

    const onConnectError = (error: any) => {
      console.error('[MainPage] Connection error:', error);
    };

    remoteSocket.on('connect', onConnect);
    remoteSocket.on('disconnect', onDisconnect);
    remoteSocket.on('connect_error', onConnectError);

    return () => {
      remoteSocket.off('connect', onConnect);
      remoteSocket.off('disconnect', onDisconnect);
      remoteSocket.off('connect_error', onConnectError);
    };
  }, [remoteSocket]);

  useEffect(() => {
    if (!isRemoteSession || !remoteSocket) {
      return;
    }

    sendRemoteCommand<{ serverPath: string }>(remoteSocket, 'server:path')
      .then((result) => {
        setServerPath(result.serverPath);
      })
      .catch((error) => {
        console.error('[MainPage] Failed to load remote server path:', error.message);
      });
  }, [isRemoteSession, remoteSocket]);

  useEffect(() => {
    if (sessionType !== 'remote' && remoteSocket) {
      console.log('[MainPage] Session type changed, disconnecting remote socket');
      remoteSocket.disconnect();
      setRemoteSocket(null);
    }
  }, [sessionType, remoteSocket]);

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
    // Si es sesión remota, desconectar socket y limpiar localStorage
    if (isRemoteSession && remoteSocket) {
      console.log('[MainPage] Logging out from remote session');
      remoteSocket.disconnect();
      setRemoteSocket(null);
      localStorage.removeItem('remoteSession');
    } else if (!isRemoteSession) {
      // Si es sesión local, usar logout de electron
      console.log('[MainPage] Logging out from local session');
      await window.electron.auth.logout();
    }
    setIsRemoteSession(false);
    setCurrentUser(null);
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
          {!isRemoteSession && (
            <button
              className={`nav-item ${currentPanel === 'remote' ? 'active' : ''}`}
              onClick={() => setCurrentPanel('remote')}
            >
              🌐 Acceso Remoto
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="current-user">
            <span className="user-icon">{isRemoteSession ? '🌐' : '👤'}</span>
            <div className="user-info">
              <span className="user-label">
                {isRemoteSession ? 'Conexión Remota' : I18nManager.t('auth.current_user')}
              </span>
              <span className="user-name">
                {currentUser?.username || currentUser?.email || currentUser?.userId || 'User'}
              </span>
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
            <DownloadManager 
              onComplete={() => alert('Download completed!')}
              isRemoteMode={isRemoteSession}
              remoteSocket={remoteSocket}
            />
          )}
          {currentPanel === 'files' && (
            <FileManager 
              serverPath={serverPath}
              isRemoteMode={isRemoteSession}
              remoteSocket={remoteSocket}
            />
          )}
          {currentPanel === 'backup' && (
            <BackupPanel 
              isRemoteMode={isRemoteSession}
              remoteSocket={remoteSocket}
            />
          )}
          {currentPanel === 'config' && (
            <ConfigPanel 
              isRemoteMode={isRemoteSession}
              remoteSocket={remoteSocket}
            />
          )}
          {currentPanel === 'discord' && (
            <DiscordPanel 
              isRemoteMode={isRemoteSession}
              remoteSocket={remoteSocket}
            />
          )}
          {currentPanel === 'remote' && !isRemoteSession && (
            <RemoteAccessPanel t={I18nManager.t.bind(I18nManager)} />
          )}
        </div>
      </main>
    </div>
  );
}
