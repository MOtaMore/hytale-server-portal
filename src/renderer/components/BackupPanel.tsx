import React, { useState, useEffect } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import { Socket } from 'socket.io-client';
import './BackupPanel.css';

interface Backup {
  id: string;
  name: string;
  date: Date;
  size: number;
  path: string;
}

export const BackupPanel: React.FC<{isRemoteMode?: boolean, remoteSocket?: Socket | null}> = ({ isRemoteMode = false, remoteSocket = null }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [backupName, setBackupName] = useState('');
  const [backupType, setBackupType] = useState<'selective' | 'full'>('selective');
  const i18n = I18nManager;

  const loadBackups = async () => {
    try {
      const result = (await window.electron.backup.list()) as any;
      setBackups(result || []);
    } catch (error: any) {
      setStatusMessage(`Error: ${error.message}`);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    setStatusMessage('Creating backup...');
    try {
      const isFull = backupType === 'full';
      await window.electron.backup.create(backupName || undefined);
      setStatusMessage(`${isFull ? 'Full' : 'Selective'} backup created successfully!`);
      setBackupName('');
      await loadBackups();
    } catch (error: any) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm(`Are you sure you want to restore backup "${backupId}"? This will overwrite current files.`)) {
      return;
    }

    setLoading(true);
    setStatusMessage('Restoring backup...');
    try {
      await window.electron.backup.restore(backupId);
      setStatusMessage('Backup restored successfully!');
    } catch (error: any) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm(`Are you sure you want to delete backup "${backupId}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await window.electron.backup.delete(backupId);
      setStatusMessage('Backup deleted successfully!');
      await loadBackups();
    } catch (error: any) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  useEffect(() => {
    loadBackups();

    // Escuchar eventos de estado
    const unsubscribe = ((window.electron as any).on('backup:status', (message: string) => {
      setStatusMessage(message);
    }) || (() => {})) as any;

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{i18n.t('backup.title')}</h2>
        <button onClick={loadBackups} disabled={loading} className="btn-secondary">
          🔄 {i18n.t('common.refresh')}
        </button>
      </div>

      <div className="backup-create">
        <input
          type="text"
          placeholder={i18n.t('backup.namePlaceholder')}
          value={backupName}
          onChange={(e) => setBackupName(e.target.value)}
          disabled={loading}
          className="input"
        />
        
        <div className="backup-type-selector">
          <label className={`backup-type-option ${backupType === 'selective' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="selective"
              checked={backupType === 'selective'}
              onChange={(e) => setBackupType(e.target.value as 'selective' | 'full')}
              disabled={loading}
            />
            <span>📦 {i18n.t('backup.selective')}</span>
          </label>
          <label className={`backup-type-option ${backupType === 'full' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="full"
              checked={backupType === 'full'}
              onChange={(e) => setBackupType(e.target.value as 'selective' | 'full')}
              disabled={loading}
            />
            <span>💾 {i18n.t('backup.full')}</span>
          </label>
        </div>

        <button onClick={createBackup} disabled={loading} className="btn-primary">
          💾 {i18n.t('backup.create')}
        </button>
      </div>

      {statusMessage && (
        <div className={`status-message ${statusMessage.includes('Error') ? 'error' : 'success'}`}>
          {statusMessage}
        </div>
      )}

      <div className="backup-list">
        {backups.length === 0 ? (
          <div className="empty-state">
            <p>{i18n.t('backup.noBackups')}</p>
          </div>
        ) : (
          <table className="backup-table">
            <thead>
              <tr>
                <th>{i18n.t('backup.name')}</th>
                <th>{i18n.t('backup.date')}</th>
                <th>{i18n.t('backup.size')}</th>
                <th>{i18n.t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td>{backup.name}</td>
                  <td>{formatDate(backup.date)}</td>
                  <td>{formatSize(backup.size)}</td>
                  <td className="actions">
                    <button
                      onClick={() => restoreBackup(backup.id)}
                      disabled={loading}
                      className="btn-success"
                      title={i18n.t('backup.restore')}
                    >
                      📥
                    </button>
                    <button
                      onClick={() => deleteBackup(backup.id)}
                      disabled={loading}
                      className="btn-danger"
                      title={i18n.t('common.delete')}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
