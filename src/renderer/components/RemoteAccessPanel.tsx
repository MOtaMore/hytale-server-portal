/**
 * RemoteAccessPanel - Panel de control de acceso remoto
 * Permite: activar/desactivar remoto, crear usuarios, asignar permisos
 */

import React, { useState, useCallback, useEffect } from 'react';
import './RemoteAccessPanel.css';

interface RemoteUser {
  id: string;
  username: string;
  email?: string;
  permissions: string[];
  createdAt: number;
  lastAccess?: number;
  isActive: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'server' | 'config' | 'backup' | 'files' | 'discord';
}

export interface RemoteAccessPanelProps {
  t: (key: string) => string;
}

export const RemoteAccessPanel: React.FC<RemoteAccessPanelProps> = ({ t }) => {
  // SECURITY: Verify this is NOT a remote session
  const isRemoteSession = localStorage.getItem('remoteSession') !== null;
  
  if (isRemoteSession) {
    console.error('[SECURITY] CRITICAL: Remote user tried to access RemoteAccessPanel!');
    return (
      <div style={{
        background: '#dc3545',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h2>🚫 Acceso Denegado</h2>
        <p>Solo el administrador del servidor puede acceder a esta sección.</p>
        <p style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>
          SECURITY: Este intento ha sido registrado.
        </p>
      </div>
    );
  }

  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'methods'>('overview');

  // Socket server status
  const [socketServerRunning, setSocketServerRunning] = useState(false);
  const [connectedClients, setConnectedClients] = useState(0);
  const [serverPort, setServerPort] = useState(9999);

  // Form states
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator' | 'viewer'>('viewer');
  const [roleTouched, setRoleTouched] = useState(false);

  // Connection methods
  const [ipv4, setIpv4] = useState('');
  const [ipv6, setIpv6] = useState('');
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [allowMethods, setAllowMethods] = useState({ ip: true, tunnel: true });

  useEffect(() => {
    loadRemoteConfig();
    loadUsers();
    loadPermissions();
    loadSocketServerStatus();
    
    // Actualizar estado del servidor cada 5 segundos
    const interval = setInterval(() => {
      loadSocketServerStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadRemoteConfig = useCallback(async () => {
    try {
      const result = (await window.electron.remote.getConfig()) as any;
      if (result) {
        setRemoteEnabled(result.enabled);
        setIpv4(result.ipv4 || '');
        setIpv6(result.ipv6 || '');
        setTunnelUrl(result.tunnelUrl || '');
        setAllowMethods({
          ip: result.methods?.includes('ip') ?? true,
          tunnel: result.methods?.includes('tunnel') ?? true,
        });
      }
    } catch (err: any) {
      console.error('Error cargando configuración remota:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const result = (await window.electron.remote.getUsers()) as any;
      setUsers(result || []);
    } catch (err: any) {
      setError(t('remote.error_load_users'));
    }
  }, [t]);

  const loadPermissions = useCallback(async () => {
    try {
      const result = (await window.electron.remote.getPermissions()) as any;
      const permissions = Array.isArray(result) ? result : [];
      const normalized = permissions.map((perm: Permission) => ({
        ...perm,
        name: t(`remote.permissions_list.${perm.id}`),
        description: perm.description || '',
      }));
      setAllPermissions(normalized);
    } catch (err: any) {
      console.error('Error cargando permisos:', err);
      setError(t('remote.error_load_permissions'));
    }
  }, [t]);

  const loadSocketServerStatus = useCallback(async () => {
    try {
      const status = await window.electron.remote.getServerStatus();
      setSocketServerRunning(status.running);
      setConnectedClients(status.clients);
      setServerPort(status.port);
    } catch (err: any) {
      console.error('Error cargando estado del servidor:', err);
    }
  }, []);

  const handleToggleRemote = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('[REMOTE] Toggling remote access, current state:', remoteEnabled);
      
      await window.electron.remote.setEnabled(!remoteEnabled);
      
      setRemoteEnabled(!remoteEnabled);
      setSuccess(remoteEnabled ? t('remote.disabled') : t('remote.enabled'));
      setTimeout(() => setSuccess(''), 3000);
      
      console.log('[REMOTE] Remote access toggled successfully');
    } catch (err: any) {
      console.error('[REMOTE] Error toggling remote access:', err);
      setError(err.toString() || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const getRolePermissions = (
    role: 'admin' | 'moderator' | 'viewer',
    permissions: Permission[],
  ) => {
    const available = new Set(permissions.map((perm) => perm.id));
    const pick = (ids: string[]) => ids.filter((id) => available.has(id));

    const admin = permissions.map((perm) => perm.id);
    const moderator = pick([
      'server_start',
      'server_stop',
      'server_restart',
      'server_view_status',
      'server_view_logs',
      'config_read',
      'backup_create',
      'backup_restore',
      'backup_view',
      'files_upload',
      'files_download',
      'files_view',
      'discord_send_messages',
      'discord_view',
      'discord_view_notifications',
    ]);
    const viewer = pick([
      'server_view_status',
      'server_view_logs',
      'config_read',
      'backup_view',
      'files_view',
      'discord_view',
      'discord_view_notifications',
    ]);

    const roleMap: Record<'admin' | 'moderator' | 'viewer', string[]> = {
      admin,
      moderator,
      viewer,
    };

    return roleMap[role];
  };

  const handleApplyRole = (role: 'admin' | 'moderator' | 'viewer') => {
    setRoleTouched(true);
    setSelectedRole(role);
  };

  useEffect(() => {
    if (!roleTouched || !allPermissions.length) {
      return;
    }

    setSelectedPermissions(getRolePermissions(selectedRole, allPermissions));
  }, [roleTouched, selectedRole, allPermissions]);

  const handlePermissionToggle = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const result = (await window.electron.remote.createUser(
        newUsername,
        newPassword,
        selectedPermissions
      )) as any;

      setSuccess(t('remote.user_created'));
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setSelectedPermissions([]);
      setShowCreateUser(false);
      await loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || t('remote.error_create_user'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('remote.delete_confirm'))) return;

    try {
      setLoading(true);
      await window.electron.remote.deleteUser(userId);
      setSuccess(t('remote.user_deleted'));
      await loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || t('remote.error_delete_user'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConnectionMethods = async () => {
    try {
      setLoading(true);
      const methods: string[] = [];
      if (allowMethods.ip) methods.push('ip');
      if (allowMethods.tunnel) methods.push('tunnel');

      await window.electron.remote.saveConfig({
        ipv4,
        ipv6,
        tunnelUrl,
        methods,
      });

      await loadRemoteConfig();

      setSuccess(t('remote.connection_saved'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || t('remote.error_save_connection'));
    } finally {
      setLoading(false);
    }
  };

  const permissionsByCategory = allPermissions.reduce(
    (acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  return (
    <div className="remote-access-panel">
      <div className="remote-header">
        <h2>🌐 {t('remote.title')}</h2>
        <div className="remote-status">
          <span className={`status-badge ${remoteEnabled ? 'active' : 'inactive'}`}>
            {remoteEnabled ? t('remote.status_active') : t('remote.status_inactive')}
          </span>
          <button
            className={`btn-toggle-remote ${remoteEnabled ? 'disable' : 'enable'}`}
            onClick={handleToggleRemote}
            disabled={loading}
          >
            {remoteEnabled ? t('remote.disable_remote') : t('remote.enable_remote')}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="remote-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 {t('remote.overview')}
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 {t('remote.users')}
        </button>
        <button
          className={`tab-button ${activeTab === 'methods' ? 'active' : ''}`}
          onClick={() => setActiveTab('methods')}
        >
          🔗 {t('remote.connection_methods')}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="remote-overview">
          <div className="info-box">
            <h3>{t('remote.status_title')}</h3>
            <p>
              <strong>{remoteEnabled ? t('remote.status_active') : t('remote.status_inactive')}</strong>
            </p>
            <p>{t('remote.total_users')}: {users.length}</p>
            <p>{t('remote.active_users')}: {users.filter((u) => u.isActive).length}</p>
          </div>

          <div className="info-box">
            <h3>🌐 {t('remote.socket_status')}</h3>
            <p>
              <strong className={socketServerRunning ? 'status-online' : 'status-offline'}>
                {socketServerRunning ? t('remote.server_online') : t('remote.server_offline')}
              </strong>
            </p>
            <p>{t('remote.socket_port')}: {serverPort}</p>
            <p>{connectedClients} {t('remote.socket_clients')}</p>
            {!socketServerRunning && remoteEnabled && (
              <p className="warning-text">⚠️ {t('remote.socket_warning')}</p>
            )}
          </div>

          <div className="info-box">
            <h3>🔌 {t('remote.methods_available')}</h3>
            <ul>
              {allowMethods.ip && <li>✓ {t('remote.method_ip')}</li>}
              {allowMethods.tunnel && <li>✓ {t('remote.method_tunnel')}</li>}
              {!allowMethods.ip && !allowMethods.tunnel && <li>✗ {t('remote.no_methods')}</li>}
            </ul>
          </div>

          <div className="info-box warning">
            <h3>⚠️ {t('remote.security_title')}</h3>
            <ul>
              <li>{t('remote.security_permissions')}</li>
              <li>{t('remote.security_encryption')}</li>
              <li>{t('remote.security_tokens')}</li>
              <li>{t('remote.security_review')}</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="remote-users">
          <div className="users-header">
            <h3>👥 {t('remote.manage_users')}</h3>
            <button
              className="btn-primary"
              onClick={() => setShowCreateUser(!showCreateUser)}
              disabled={!remoteEnabled || loading}
            >
              {showCreateUser ? `✕ ${t('remote.cancel')}` : `+ ${t('remote.create_user')}`}
            </button>
          </div>

          {showCreateUser && (
            <form className="create-user-form" onSubmit={handleCreateUser}>
              <div className="form-row">
                <input
                  type="text"
                  placeholder={t('remote.username_placeholder')}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={loading}
                  required
                  minLength={3}
                />
                <input
                  type="password"
                  placeholder={t('remote.password_placeholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={8}
                />
                <input
                  type="email"
                  placeholder={t('remote.email_placeholder')}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="role-selector">
                <label>{t('remote.role_shortcuts')}:</label>
                <div className="role-buttons">
                  <button
                    type="button"
                    className={`role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
                    onClick={() => handleApplyRole('admin')}
                  >
                    {t('remote.role_admin')}
                  </button>
                  <button
                    type="button"
                    className={`role-btn ${selectedRole === 'moderator' ? 'active' : ''}`}
                    onClick={() => handleApplyRole('moderator')}
                  >
                    {t('remote.role_moderator')}
                  </button>
                  <button
                    type="button"
                    className={`role-btn ${selectedRole === 'viewer' ? 'active' : ''}`}
                    onClick={() => handleApplyRole('viewer')}
                  >
                    {t('remote.role_viewer')}
                  </button>
                </div>
              </div>

              <div className="permissions-section">
                <label>{t('remote.select_permissions')}:</label>
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category} className="permission-category">
                    <h4>{t(`remote.permission_categories.${category}`)}</h4>
                    <div className="permission-grid">
                      {perms.map((perm) => (
                        <label key={perm.id} className="permission-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.id)}
                            onChange={() => handlePermissionToggle(perm.id)}
                          />
                          <span>{perm.name || t(`remote.permissions_list.${perm.id}`)}</span>
                          {perm.description && <small>{perm.description}</small>}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? t('common.loading') : t('remote.save_user')}
                </button>
              </div>
            </form>
          )}

          <div className="users-list">
            {users.length === 0 ? (
              <div className="empty-state">{t('remote.no_users')}</div>
            ) : (
              users.map((user) => (
                <div key={user.id} className={`user-card ${user.isActive ? '' : 'inactive'}`}>
                  <div className="user-info">
                    <h4>{user.username}</h4>
                    {user.email && <p className="user-email">{user.email}</p>}
                    <p className="user-perms">
                      {user.permissions.length} {t('remote.permissions')} | Creado:{' '}
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    {user.lastAccess && (
                      <p className="user-access">
                        Último acceso: {new Date(user.lastAccess).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="user-actions">
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={loading}
                    >
                      🗑️ {t('remote.delete_user')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'methods' && (
        <div className="remote-methods">
          <h3>🔗 {t('remote.connection_methods')}</h3>

          <div className="method-option">
            <label className="method-toggle">
              <input
                type="checkbox"
                checked={allowMethods.ip}
                onChange={(e) => setAllowMethods({ ...allowMethods, ip: e.target.checked })}
              />
              <span>{t('remote.method_ip')}</span>
            </label>
            {allowMethods.ip && (
              <div className="method-config">
                <input
                  type="text"
                  placeholder={t('remote.ipv4_placeholder')}
                  value={ipv4}
                  onChange={(e) => setIpv4(e.target.value)}
                />
                <input
                  type="text"
                  placeholder={t('remote.ipv6_placeholder')}
                  value={ipv6}
                  onChange={(e) => setIpv6(e.target.value)}
                />
                <p className="help-text">{t('remote.tunnel_help')}</p>
              </div>
            )}
          </div>

          <div className="method-option">
            <label className="method-toggle">
              <input
                type="checkbox"
                checked={allowMethods.tunnel}
                onChange={(e) => setAllowMethods({ ...allowMethods, tunnel: e.target.checked })}
              />
              <span>{t('remote.method_tunnel')}</span>
            </label>
            {allowMethods.tunnel && (
              <div className="method-config">
                <input
                  type="text"
                  placeholder={t('remote.tunnel_placeholder')}
                  value={tunnelUrl}
                  onChange={(e) => setTunnelUrl(e.target.value)}
                />
                <p className="help-text">{t('remote.tunnel_help')}</p>
              </div>
            )}
          </div>

          <button
            className="btn-save btn-block"
            onClick={handleUpdateConnectionMethods}
            disabled={loading}
          >
            {loading ? t('common.loading') : t('remote.save_connection')}
          </button>
        </div>
      )}
    </div>
  );
};

export default RemoteAccessPanel;
