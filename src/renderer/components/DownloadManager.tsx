import React, { useState, useEffect, useCallback } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import './DownloadManager.css';

interface DownloadState {
  status: string;
  progress: number;
  message: string;
  serverPath?: string;
  serverVersion?: string;
  error?: string;
  deviceCodeUrl?: string;
  deviceCode?: string;
}

interface DownloadManagerProps {
  onComplete?: () => void;
}

export default function DownloadManager({ onComplete }: DownloadManagerProps) {
  const t = (key: string) => I18nManager.t(key);
  const [selectedPath, setSelectedPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>({
    status: 'IDLE',
    progress: 0,
    message: t('download.status'),
  });
  const [cliReady, setCliReady] = useState(false);
  const [serverVersion, setServerVersion] = useState('');
  const [setupStep, setSetupStep] = useState<'select' | 'setup' | 'download' | 'complete'>('select');

  // Cargar estado guardado al montar
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const result = await window.electron.download.loadSavedState();
        if (result.success && result.state) {
          const saved = result.state;
          setDownloadState(saved);
          
          // Restaurar el paso en el que estaba
          if (saved.serverPath) {
            setSelectedPath(saved.serverPath);
            
            // Detectar si el servidor ya está instalado
            const isInstalledResult = await window.electron.files.isServerInstalled(saved.serverPath);
            if (isInstalledResult.success && isInstalledResult.isInstalled) {
              setCliReady(true);
              setSetupStep('complete');
              return;
            }
          }
          
          if (saved.status && saved.status !== 'IDLE' && saved.status !== 'ERROR') {
            if (saved.status === 'CLI_READY' || saved.status === 'COMPLETED') {
              setCliReady(true);
              setSetupStep('download');
            } else if (saved.status === 'DOWNLOADING_SERVER' || saved.status === 'AUTHENTICATING') {
              setCliReady(true);
              setSetupStep('download');
            }
          }
          
          if (saved.serverVersion) {
            setServerVersion(saved.serverVersion);
          }
        }
      } catch (error) {
        console.warn('Could not load saved download state:', error);
      }
    };

    loadSavedState();
  }, []);

  // Guardar estado cuando cambia (para persistencia)
  useEffect(() => {
    if (downloadState.status && downloadState.status !== 'IDLE') {
      const stateToSave = {
        ...downloadState,
        serverPath: selectedPath,
      };
      window.electron.download.saveState(stateToSave).catch((err) => {
        console.warn('Could not save download state:', err);
      });
    }
  }, [downloadState, selectedPath]);

  // Polling del estado de descarga
  useEffect(() => {
    if (downloadState.status === 'DOWNLOADING_SERVER') {
      const interval = setInterval(async () => {
        try {
          const state = await window.electron.download.getState();
          setDownloadState(state);
        } catch (error) {
          console.error('Error polling download state:', error);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [downloadState.status]);

  /**
   * Seleccionar carpeta del servidor
   */
  const handleSelectFolder = useCallback(async () => {
    try {
      const result = await window.electron.dialog.openDirectory();
      
      if (result && !result.canceled && result.filePaths && result.filePaths[0]) {
        const selectedFolder = result.filePaths[0];
        setSelectedPath(selectedFolder);
        
        // Guardar la ruta del servidor también
        window.electron.server.setPath(selectedFolder).catch(() => {});
        
        // Detectar si el servidor ya está instalado en esta carpeta
        try {
          const isInstalledResult = await window.electron.files.isServerInstalled(selectedFolder);
          if (isInstalledResult.success && isInstalledResult.isInstalled) {
            // El servidor ya está instalado, mostrar opción de reinstalar/actualizar
            setCliReady(true);
            setSetupStep('complete');
            setDownloadState({
              status: 'COMPLETED',
              progress: 100,
              message: t('download.server_already_installed'),
            });
          } else {
            // No está instalado, mostrar opciones de descarga
            setSetupStep('select');
          }
        } catch (err) {
          console.warn('Could not check if server is installed:', err);
          setSetupStep('select');
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert(t('download.error') + ': ' + error);
    }
  }, [t]);

  /**
   * Setup de la carpeta del servidor (copia CLI y scripts)
   */
  const handleSetupFolder = useCallback(async () => {
    if (!selectedPath) {
      alert(t('download.select_folder'));
      return;
    }

    try {
      setIsLoading(true);
      setSetupStep('setup');

      const result = await window.electron.download.setupFolder(selectedPath);

      if (!result.success) {
        const errorMessage = result.error || result.state?.error || 'Unknown error during setup';
        console.error('Setup failed:', result);
        alert(`${t('download.error')}: ${errorMessage}`);
        setIsLoading(false);
        setDownloadState({
          status: 'ERROR',
          progress: 0,
          message: errorMessage,
          error: errorMessage,
        });
        return;
      }

      setDownloadState(result.state);
      setCliReady(true);

      // Omitir checkVersion por ahora - puede estar colgando
      // try {
      //   const versionResult = await window.electron.download.checkVersion(selectedPath);
      //   if (versionResult.success) {
      //     setServerVersion(versionResult.version);
      //     setDownloadState(versionResult.state);
      //   }
      // } catch (error) {
      //   console.warn('Could not check version:', error);
      // }

      // Avanzar al paso de descarga
      console.log('Setup complete, advancing to download step');
      setSetupStep('download');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error setting up folder:', error);
      alert(`${t('download.error')}: ${error.message}`);
      setIsLoading(false);
    }
  }, [selectedPath, t]);

  /**
   * Iniciar descarga
   */
  const handleDownload = useCallback(async () => {
    if (!selectedPath || !cliReady) {
      alert(t('download.select_folder'));
      return;
    }

    try {
      setIsLoading(true);
      setSetupStep('download');

      await window.electron.download.start(selectedPath);

      // Esperar a que se complete
      const checkCompletion = setInterval(async () => {
        const state = await window.electron.download.getState();
        setDownloadState(state);

        if (state.status === 'COMPLETED') {
          clearInterval(checkCompletion);
          setIsLoading(false);
          setSetupStep('complete');
          
          // Guardar la ruta del servidor
          if (selectedPath) {
            window.electron.server.setPath(selectedPath).catch(() => {});
          }
          
          // Limpiar estado guardado al completar
          window.electron.download.saveState({
            status: 'IDLE',
            progress: 0,
            message: '',
          }).catch(() => {});
          
          if (onComplete) {
            onComplete();
          }
        } else if (state.status === 'ERROR') {
          clearInterval(checkCompletion);
          setIsLoading(false);
          alert(`${t('download.error')}: ${state.error}`);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error starting download:', error);
      alert(`${t('download.error')}: ${error.message}`);
      setIsLoading(false);
    }
  }, [selectedPath, cliReady, onComplete, t]);

  /**
   * Reintentar descarga (reset y volver a intentar)
   */
  const handleRetry = useCallback(async () => {
    try {
      setIsLoading(true);
      await window.electron.download.reset();
      setDownloadState({
        status: 'IDLE',
        progress: 0,
        message: t('download.status'),
      });
      setIsLoading(false);
      await handleDownload();
    } catch (error: any) {
      console.error('Error retrying download:', error);
      alert(`${t('download.error')}: ${error.message}`);
      setIsLoading(false);
    }
  }, [handleDownload, t]);

  /**
   * Reinstalar/Actualizar servidor
   */
  const handleReinstall = useCallback(async () => {
    const confirm = window.confirm(t('download.reinstall_confirm'));
    if (!confirm) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Reset del estado
      await window.electron.download.reset();
      setDownloadState({
        status: 'IDLE',
        progress: 0,
        message: t('download.status'),
      });
      
      // Volver al paso de selección para comenzar de nuevo
      setSetupStep('select');
      setCliReady(false);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error reinstalling:', error);
      alert(`${t('download.error')}: ${error.message}`);
      setIsLoading(false);
    }
  }, [t]);

  /**
   * Obtiene el color para el estado
   */
  const getStatusColor = (): string => {
    switch (downloadState.status) {
      case 'CLI_READY':
      case 'COMPLETED':
        return '#22c55e';
      case 'DOWNLOADING_SERVER':
      case 'COPYING_CLI':
      case 'CHECKING_VERSION':
        return '#3b82f6';
      case 'ERROR':
        return '#ef4444';
      default:
        return '#8b5cf6';
    }
  };

  /**
   * Obtiene la clave de traducción del estado
   */
  const getStatusTranslationKey = (): string => {
    const status = downloadState.status?.toUpperCase() || 'IDLE';
    const statusMap: Record<string, string> = {
      'IDLE': 'idle',
      'SELECTING_FOLDER': 'status',
      'COPYING_CLI': 'copying_cli',
      'CLI_READY': 'cli_ready',
      'CHECKING_VERSION': 'checking_version',
      'AUTHENTICATING': 'authenticating',
      'DOWNLOADING_SERVER': 'downloading',
      'EXTRACTING': 'extracting',
      'COMPLETED': 'completed',
      'ERROR': 'error',
    };
    return 'download.' + (statusMap[status] || 'status');
  };

  return (
    <div className="download-manager">
      <div className="download-header">
        <h2>{t('download.title')}</h2>
        <span className="download-step-indicator">
          {setupStep === 'select' && '1/3: ' + t('download.select_folder')}
          {setupStep === 'setup' && '2/3: ' + t('download.installing')}
          {setupStep === 'download' && '3/3: ' + t('download.downloading')}
          {setupStep === 'complete' && '✓ ' + t('download.complete')}
        </span>
      </div>

      {/* Estado del CLI */}
      <div className="download-status-section">
        <div className="status-badge" style={{ borderColor: getStatusColor() }}>
          <div className="status-dot" style={{ backgroundColor: getStatusColor() }} />
          <span>{t(getStatusTranslationKey())}</span>
        </div>
        {serverVersion && <p className="server-version">{t('download.version')}: {serverVersion}</p>}
        {downloadState.message && (
          <p className="download-message" style={{ 
            whiteSpace: 'pre-wrap', 
            fontFamily: downloadState.status === 'AUTHENTICATING' ? 'monospace' : 'inherit',
            backgroundColor: downloadState.status === 'AUTHENTICATING' ? '#1a1a2e' : 'transparent',
            padding: downloadState.status === 'AUTHENTICATING' ? '10px' : '0',
            borderRadius: '5px'
          }}>
            {downloadState.message}
          </p>
        )}
      </div>

      {/* Selector de carpeta */}
      {setupStep === 'select' && (
        <div className="download-section">
          <label className="folder-label">{t('download.selected_folder')}:</label>
          <div className="folder-input-group">
            <input
              type="text"
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              placeholder={t('download.select_folder')}
              className="folder-input"
              disabled={setupStep !== 'select'}
            />
            <button onClick={handleSelectFolder} className="btn-browse" disabled={isLoading}>
              {t('download.browse')}
            </button>
          </div>
        </div>
      )}

      {/* Botón Setup */}
      {setupStep === 'select' && selectedPath && (
        <button
          onClick={handleSetupFolder}
          disabled={isLoading || !selectedPath}
          className="btn-primary btn-install"
        >
          {isLoading ? t('download.installing') : t('download.install')}
        </button>
      )}

      {/* Información de setup */}
      {setupStep === 'setup' && (
        <div className="download-info">
          <div className="info-item">
            <span className="checkmark">✓</span>
            <span>{t('download.cli_installed')}</span>
          </div>
          <div className="info-item">
            <span className="checkmark">✓</span>
            <span>{t('download.scripts_copied')}</span>
          </div>
        </div>
      )}

      {/* Botón Descargar */}
      {setupStep === 'download' && cliReady && (
        <button
          onClick={handleDownload}
          disabled={isLoading}
          className="btn-primary btn-download"
        >
          {isLoading && downloadState.status === 'DOWNLOADING_SERVER'
            ? `${t('download.downloading')} ${downloadState.progress}%`
            : t('download.start_download')}
        </button>
      )}

      {/* Alerta de Autenticación */}
      {downloadState.status === 'AUTHENTICATING' && (
        <div className="auth-alert" style={{
          backgroundColor: '#2d3748',
          border: '2px solid #4299e1',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#4299e1', marginTop: 0 }}>🔐 {t('download.authenticate')}</h3>
          <p style={{ color: '#cbd5e0', marginBottom: '15px' }}>
            {t('download.auth_instructions') || 'Por favor, autoriza la aplicación en tu navegador'}
          </p>
          
          {downloadState.deviceCodeUrl && (
            <div style={{ marginBottom: '15px' }}>
              <strong style={{ color: '#48bb78' }}>URL de autorización:</strong>
              <a 
                href={downloadState.deviceCodeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  color: '#4299e1',
                  padding: '10px',
                  backgroundColor: '#1a202c',
                  borderRadius: '5px',
                  marginTop: '5px',
                  textDecoration: 'none',
                  wordBreak: 'break-all'
                }}
              >
                {downloadState.deviceCodeUrl}
              </a>
            </div>
          )}
          
          {downloadState.deviceCode && (
            <div style={{ marginBottom: '15px' }}>
              <strong style={{ color: '#48bb78' }}>Código de dispositivo:</strong>
              <div style={{
                color: '#fff',
                padding: '10px',
                backgroundColor: '#1a202c',
                borderRadius: '5px',
                marginTop: '5px',
                fontFamily: 'monospace',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '2px'
              }}>
                {downloadState.deviceCode}
              </div>
            </div>
          )}
          
          {downloadState.message && (
            <pre style={{
              backgroundColor: '#1a202c',
              color: '#e2e8f0',
              padding: '15px',
              borderRadius: '5px',
              overflow: 'auto',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {downloadState.message}
            </pre>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                if (downloadState.deviceCodeUrl) {
                  window.electron.dialog.openDirectory(); // Dummy to focus window
                  window.open(downloadState.deviceCodeUrl, '_blank');
                }
              }}
              style={{
                backgroundColor: '#4299e1',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔗 Abrir enlace de autenticación
            </button>
            <button
              onClick={handleRetry}
              disabled={isLoading}
              style={{
                backgroundColor: '#ed8936',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              🔄 Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {setupStep === 'download' && downloadState.progress > 0 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${downloadState.progress}%` }}
            />
          </div>
          <span className="progress-text">{downloadState.progress}%</span>
        </div>
      )}

      {/* Mensaje de error */}
      {downloadState.error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{downloadState.error}</span>
        </div>
      )}

      {/* Completado */}
      {setupStep === 'complete' && (
        <div>
          <div className="success-message">
            <span className="success-icon">✓</span>
            <span>{t('download.complete')}</span>
          </div>
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={handleReinstall}
              disabled={isLoading}
              style={{
                backgroundColor: '#805ad5',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              🔄 {t('download.reinstall')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
