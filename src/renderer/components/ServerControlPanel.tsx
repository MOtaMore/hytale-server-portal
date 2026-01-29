import React, { useState, useEffect, useRef } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import { Socket } from 'socket.io-client';
import { sendRemoteCommand } from '../utils/remoteCommand';
import './ServerControlPanel.css';

interface ServerControlPanelProps {
  serverPath?: string;
  isRemoteMode?: boolean;
  remoteSocket?: Socket | null;
}

interface ServerState {
  status: string;
  pid?: number;
  uptime?: number;
  lastLog?: string;
}

/**
 * Panel de control del servidor Hytale - Fase 1
 * Soporta modo local (IPC) y modo remoto (Socket.io)
 */
export default function ServerControlPanel({ serverPath, isRemoteMode = false, remoteSocket = null }: ServerControlPanelProps) {
  const [status, setStatus] = useState<string>('stopped');
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentServerPath, setCurrentServerPath] = useState<string | null | undefined>(serverPath);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll a los logs más recientes
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Configurar listeners del socket remoto si está en modo remoto
  useEffect(() => {
    if (isRemoteMode && remoteSocket) {
      console.log('[ServerControlPanel] Setting up socket listeners');

      // Solicitar estado inicial si ya está conectado
      if (remoteSocket.connected) {
        sendRemoteCommand<any>(remoteSocket, 'server:status')
          .then((response) => {
            setStatus(response.status);
          })
          .catch((error) => {
            console.error('[ServerControlPanel] Failed to load status:', error.message);
          });

        sendRemoteCommand<any>(remoteSocket, 'server:logs')
          .then((response) => {
            setLogs(response.logs || []);
          })
          .catch((error) => {
            console.error('[ServerControlPanel] Failed to load logs:', error.message);
          });
      }

      // Configurar listeners
      const onStatusChanged = (data: any) => {
        console.log('[ServerControlPanel] Status changed:', data);
        setStatus(data.status);
      };

      const onLogsUpdated = (data: any) => {
        console.log('[ServerControlPanel] Logs updated');
        setLogs(data.logs || []);
      };

      const onConnect = () => {
        console.log('[ServerControlPanel] Socket connected, fetching status');
        sendRemoteCommand<any>(remoteSocket, 'server:status')
          .then((response) => {
            setStatus(response.status);
          })
          .catch((error) => {
            console.error('[ServerControlPanel] Failed to load status:', error.message);
          });

        sendRemoteCommand<any>(remoteSocket, 'server:logs')
          .then((response) => {
            setLogs(response.logs || []);
          })
          .catch((error) => {
            console.error('[ServerControlPanel] Failed to load logs:', error.message);
          });
      };

      remoteSocket.on('connect', onConnect);
      remoteSocket.on('server:status-changed', onStatusChanged);
      remoteSocket.on('server:logs-updated', onLogsUpdated);

      // Si ya está conectado, cargar estado inicial
      if (remoteSocket.connected) {
        onConnect();
      }

      // Cleanup: remover solo los listeners
      return () => {
        console.log('[ServerControlPanel] Removing socket listeners');
        remoteSocket.off('connect', onConnect);
        remoteSocket.off('server:status-changed', onStatusChanged);
        remoteSocket.off('server:logs-updated', onLogsUpdated);
      };
    }
  }, [isRemoteMode, remoteSocket]);

  // Cargar ruta del servidor si no está disponible (solo modo local)
  useEffect(() => {
    if (!isRemoteMode && !serverPath) {
      window.electron.server.getPath().then(path => {
        setCurrentServerPath(path);
      }).catch(err => {
        console.error('Error loading server path:', err);
      });
    } else {
      setCurrentServerPath(serverPath);
    }
  }, [serverPath, isRemoteMode]);

  // Cargar estado inicial (solo modo local)
  useEffect(() => {
    if (!isRemoteMode) {
      loadStatus();
      
      // Escuchar eventos de actualización de logs desde el main process
      window.electron.on('server:logs-updated', (newLogs: string[]) => {
        setLogs(newLogs);
      });

      window.electron.on('server:status-changed', (state: ServerState) => {
        setStatus(state.status);
      });

      // Cleanup listeners
      return () => {
        window.electron.off('server:logs-updated');
        window.electron.off('server:status-changed');
      };
    }
  }, [isRemoteMode]);

  const loadStatus = async () => {
    try {
      const state = await window.electron.server.getStatus();
      setStatus(state.status);
      
      const newLogs = await window.electron.server.getLogs();
      setLogs(newLogs);
    } catch (error) {
      console.error('Error loading server status:', error);
    }
  };

  const handleStart = async () => {
    if (!isRemoteMode && !currentServerPath) {
      alert(I18nManager.t('server.no_path'));
      return;
    }

    setIsLoading(true);
    try {
      if (isRemoteMode && remoteSocket) {
        // Usar socket remoto
        sendRemoteCommand(remoteSocket, 'server:start')
          .then(async () => {
            const statusResponse = await sendRemoteCommand<any>(remoteSocket, 'server:status');
            setStatus(statusResponse.status);
          })
          .catch((error) => {
            alert(`${I18nManager.t('server.error')}: ${error.message}`);
          })
          .finally(() => setIsLoading(false));
      } else {
        // Modo local (IPC)
        const result = await window.electron.server.start();
        if (result.success) {
          setStatus(result.state.status);
          await loadStatus();
        } else {
          alert(`${I18nManager.t('server.error')}: ${result.error || 'Unknown error'}`);
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error starting server:', error);
      alert(I18nManager.t('server.error'));
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      if (isRemoteMode && remoteSocket) {
        // Usar socket remoto
        sendRemoteCommand(remoteSocket, 'server:stop')
          .then(async () => {
            const statusResponse = await sendRemoteCommand<any>(remoteSocket, 'server:status');
            setStatus(statusResponse.status);
          })
          .catch((error) => {
            alert(`${I18nManager.t('server.error')}: ${error.message}`);
          })
          .finally(() => setIsLoading(false));
      } else {
        // Modo local (IPC)
        const result = await window.electron.server.stop();
        if (result.success) {
          setStatus(result.state.status);
          await loadStatus();
        } else {
          alert(`${I18nManager.t('server.error')}: ${result.error || 'Unknown error'}`);
        }
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Error stopping server:', error);
      alert(`${I18nManager.t('server.error')}: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    try {
      if (isRemoteMode && remoteSocket) {
        // Usar socket remoto
        sendRemoteCommand(remoteSocket, 'server:restart')
          .then(async () => {
            const statusResponse = await sendRemoteCommand<any>(remoteSocket, 'server:status');
            setStatus(statusResponse.status);
          })
          .catch((error) => {
            alert(`${I18nManager.t('server.error')}: ${error.message}`);
          })
          .finally(() => setIsLoading(false));
      } else {
        // Modo local (IPC)
        const result = await window.electron.server.restart();
        if (result.success) {
          setStatus(result.state.status);
          await loadStatus();
        } else {
          alert(`${I18nManager.t('server.error')}: ${result.error || 'Unknown error'}`);
        }
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Error restarting server:', error);
      alert(`${I18nManager.t('server.error')}: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    try {
      if (isRemoteMode && remoteSocket) {
        // Usar socket remoto
        remoteSocket.emit('server:send-command', { command }, (response: any) => {
          if (response.success) {
            setCommand('');
          }
        });
      } else {
        // Modo local (IPC)
        const result = await window.electron.server.sendCommand(command);
        if (result.success) {
          setCommand('');
          await loadStatus();
        }
      }
    } catch (error) {
      console.error('Error sending command:', error);
    }
  };

  const handleClearLogs = async () => {
    try {
      await window.electron.server.clearLogs();
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#10b981';
      case 'starting':
        return '#f59e0b';
      case 'stopping':
        return '#ef4444';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = () => {
    const key = `server.status_${status}`;
    return I18nManager.t(key) || status;
  };

  return (
    <div className="server-control-panel">
      {/* Header */}
      <div className="panel-header">
        <h1 className="panel-title">
          {I18nManager.t('server.title')}
        </h1>
        
        {/* Status Indicator */}
        <div className="status-indicator">
          <div
            className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
          ></div>
          <span className="status-label">{getStatusLabel()}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="control-buttons">
        <button
          className="btn btn-success"
          onClick={handleStart}
          disabled={isLoading || status === 'running' || status === 'starting'}
        >
          {I18nManager.t('server.start_button')}
        </button>
        <button
          className="btn btn-danger"
          onClick={handleStop}
          disabled={isLoading || status === 'stopped' || status === 'stopping'}
        >
          {I18nManager.t('server.stop_button')}
        </button>
        <button
          className="btn btn-warning"
          onClick={handleRestart}
          disabled={isLoading || status === 'stopped'}
        >
          {I18nManager.t('server.restart_button')}
        </button>
      </div>

      {/* Console Section */}
      <div className="console-section">
        <div className="console-header">
          <h2 className="console-title">
            {I18nManager.t('server.console')}
          </h2>
          <button
            className="btn-secondary"
            onClick={handleClearLogs}
          >
            Limpiar
          </button>
        </div>

        {/* Logs Display */}
        <div className="logs-container">
          {logs.map((log, index) => (
            <div key={index} className="log-line">
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Command Input */}
        <form onSubmit={handleSendCommand} className="command-form">
          <input
            type="text"
            className="command-input"
            placeholder={I18nManager.t('server.console_placeholder')}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isLoading || status !== 'running'}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || status !== 'running' || !command.trim()}
          >
            {I18nManager.t('server.send_command')}
          </button>
        </form>
      </div>
    </div>
  );
}
