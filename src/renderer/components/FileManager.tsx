import React, { useState, useEffect, useCallback } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import './FileManager.css';

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  extension?: string;
}

interface FileManagerProps {
  serverPath: string | null;
}

export default function FileManager({ serverPath }: FileManagerProps) {
  const t = (key: string) => I18nManager.t(key);
  const [rootPath, setRootPath] = useState<string>(''); // Ruta raíz (no se puede subir más)
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Inicializar con la ruta del servidor
  useEffect(() => {
    if (serverPath) {
      setRootPath(serverPath);
      setCurrentPath(serverPath);
      loadFiles(serverPath);
    }
  }, [serverPath]);

  /**
   * Carga la lista de archivos de un directorio
   */
  const loadFiles = useCallback(async (dirPath: string) => {
    try {
      setIsLoading(true);
      setError('');

      const result = await window.electron.files.list(dirPath);

      if (result.success) {
        setFiles(result.files);
        setCurrentPath(dirPath);
      } else {
        setError(result.error || 'Error al cargar archivos');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar archivos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Navega a un directorio
   */
  const handleNavigate = useCallback((file: FileInfo) => {
    if (file.isDirectory) {
      loadFiles(file.path);
      setSelectedFile(null);
      setFileContent('');
      setIsEditing(false);
    } else {
      // Ver/editar archivo
      handleViewFile(file);
    }
  }, [loadFiles]);

  /**
   * Navega hacia atrás (directorio padre)
   */
  const handleGoBack = useCallback(() => {
    // Validar que no intente subir más allá de la raíz
    if (currentPath === rootPath) {
      return; // No hacer nada si ya estamos en la raíz
    }

    const parentPath = currentPath.split(/[\\/]/).slice(0, -1).join('/');
    
    // Validar que el directorio padre no sea más arriba que la raíz
    if (parentPath && parentPath !== currentPath && parentPath.length >= rootPath.length) {
      loadFiles(parentPath);
      setSelectedFile(null);
      setFileContent('');
      setIsEditing(false);
    }
  }, [currentPath, rootPath, loadFiles]);

  /**
   * Ver contenido de un archivo
   */
  const handleViewFile = useCallback(async (file: FileInfo) => {
    try {
      setIsLoading(true);
      setError('');

      // Verificar si es editable
      const editableResult = await window.electron.files.isEditable(file.path);

      if (!editableResult.isEditable) {
        setError(t('files.not_editable'));
        setSelectedFile(file);
        return;
      }

      // Leer contenido
      const result = await window.electron.files.read(file.path);

      if (result.success) {
        setSelectedFile(file);
        setFileContent(result.content.content);
        setIsEditing(false);
      } else {
        setError(result.error || 'Error al leer archivo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al leer archivo');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  /**
   * Guarda cambios en el archivo
   */
  const handleSaveFile = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      setError('');

      const result = await window.electron.files.write(selectedFile.path, fileContent);

      if (result.success) {
        setIsEditing(false);
        alert(t('files.file_saved'));
      } else {
        setError(result.error || 'Error al guardar archivo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar archivo');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, fileContent, t]);

  /**
   * Elimina un archivo
   */
  const handleDeleteFile = useCallback(async (file: FileInfo) => {
    if (!confirm(t('files.confirm_delete'))) return;

    try {
      setIsLoading(true);
      setError('');

      const result = await window.electron.files.delete(file.path);

      if (result.success) {
        alert(t('files.file_deleted'));
        loadFiles(currentPath);
        if (selectedFile?.path === file.path) {
          setSelectedFile(null);
          setFileContent('');
        }
      } else {
        setError(result.error || 'Error al eliminar archivo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar archivo');
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, loadFiles, selectedFile, t]);

  /**
   * Sube archivos a la carpeta actual
   */
  const handleUploadFiles = useCallback(async () => {
    try {
      // Usar el dialog nativo de Electron para seleccionar archivos
      const filePaths = await window.electron.dialog.openFiles();
      if (!filePaths || filePaths.length === 0) return;

      setIsLoading(true);
      setError('');

      try {
        // Llamar al backend para copiar los archivos
        const result = await window.electron.files.upload(currentPath, filePaths);

        if (result.success || result.uploaded.length > 0) {
          const uploadedCount = result.uploaded.length;
          alert(`${uploadedCount} archivo(s) subido(s) exitosamente`);
          loadFiles(currentPath);
        } else if (result.failed.length > 0) {
          const failedMsg = result.failed.map((f: any) => `${f.path}: ${f.error}`).join('\n');
          setError(`Error al subir archivos:\n${failedMsg}`);
        }
      } catch (err: any) {
        setError(err.message || 'Error al subir archivos');
      } finally {
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error al seleccionar archivos');
    }
  }, [currentPath, loadFiles, t]);

  /**
   * Formatea el tamaño del archivo
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!serverPath) {
    return (
      <div className="file-manager">
        <div className="no-server-message">
          <p>{t('files.no_server')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h2>{t('files.title')}</h2>
        <button onClick={handleGoBack} className="btn-back" disabled={isLoading || currentPath === rootPath}>
          ← {t('files.back')}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="file-manager-content">
        {/* Lista de archivos */}
        <div className="file-list">
          <div className="current-path">{currentPath}</div>

          <button onClick={handleUploadFiles} className="btn-upload" disabled={isLoading}>
            ⬆️ {t('files.upload')}
          </button>

          {isLoading && <div className="loading">Cargando...</div>}

          {!isLoading && files.length === 0 && (
            <div className="empty-message">{t('files.empty_folder')}</div>
          )}

          {!isLoading && files.map((file) => (
            <div
              key={file.path}
              className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
              onClick={() => handleNavigate(file)}
            >
              <div className="file-icon">
                {file.isDirectory ? '📁' : '📄'}
              </div>
              <div className="file-details">
                <div className="file-name">{file.name}</div>
                <div className="file-meta">
                  {!file.isDirectory && <span>{formatFileSize(file.size)}</span>}
                  <span>{new Date(file.modified).toLocaleString()}</span>
                </div>
              </div>
              <button
                className="btn-delete-small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFile(file);
                }}
                disabled={isLoading}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* Visor/Editor de archivos */}
        {selectedFile && (
          <div className="file-viewer">
            <div className="viewer-header">
              <h3>{selectedFile.name}</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-edit"
                  disabled={isLoading}
                >
                  {t('files.edit')}
                </button>
              )}
              {isEditing && (
                <div className="edit-actions">
                  <button onClick={handleSaveFile} className="btn-save" disabled={isLoading}>
                    {t('files.save')}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      handleViewFile(selectedFile);
                    }}
                    className="btn-cancel"
                    disabled={isLoading}
                  >
                    {t('files.cancel')}
                  </button>
                </div>
              )}
            </div>

            {fileContent && (
              <textarea
                className="file-content-editor"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                readOnly={!isEditing}
                spellCheck={false}
              />
            )}

            {!fileContent && (
              <div className="no-preview">
                <p>{t('files.no_preview')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
