import React, { useState, useEffect } from 'react';
import { I18nManager } from '../../shared/i18n/I18nManager';
import './ConfigPanel.css';

interface Config {
  ramMin: number;
  ramMax: number;
  cpuMin?: number;
  cpuMax?: number;
  properties: Record<string, any>;
}

interface SystemResources {
  totalRAM: number;
  totalCPUs: number;
}

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [editorTab, setEditorTab] = useState<'visual' | 'text'>('visual');
  const [editedJSON, setEditedJSON] = useState('');

  useEffect(() => {
    loadConfig();
    loadSystemResources();
  }, []);

  const loadSystemResources = async () => {
    try {
      const resources = await window.electron.config.getSystemResources();
      setSystemResources(resources);
    } catch (error) {
      console.error('Error cargando recursos del sistema:', error);
    }
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const result = await window.electron.config.read();
      setConfig(result);
      setEditedJSON(JSON.stringify(result.properties, null, 2));
      setStatusMessage('');
    } catch (error) {
      setStatusMessage(`${I18nManager.t('common.error')}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    try {
      let updatedProperties = config.properties;
      
      if (editorTab === 'text') {
        try {
          updatedProperties = JSON.parse(editedJSON);
        } catch (e) {
          setStatusMessage(I18nManager.t('config.invalid_json'));
          return;
        }
      }

      const updatedConfig = {
        ...config,
        properties: updatedProperties,
      };
      
      await window.electron.config.write(updatedConfig);
      setConfig(updatedConfig);
      setEditedJSON(JSON.stringify(updatedProperties, null, 2));
      setStatusMessage(I18nManager.t('config.saved'));
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage(`${I18nManager.t('common.error')}: ${error}`);
    }
  };

  const handleRamMinChange = (value: number) => {
    if (config) {
      // Asegurar que ramMin no sea mayor que ramMax
      const newRamMin = Math.min(value, config.ramMax);
      setConfig({ ...config, ramMin: newRamMin });
    }
  };

  const handleRamMaxChange = (value: number) => {
    if (config) {
      // Asegurar que ramMax no sea menor que ramMin
      const newRamMax = Math.max(value, config.ramMin);
      setConfig({ ...config, ramMax: newRamMax });
    }
  };

  const handleCpuMinChange = (value: number) => {
    if (config) {
      // Asegurar que cpuMin no sea mayor que cpuMax
      const newCpuMin = Math.min(value, config.cpuMax || 1);
      setConfig({ ...config, cpuMin: newCpuMin });
    }
  };

  const handleCpuMaxChange = (value: number) => {
    if (config) {
      // Asegurar que cpuMax no sea menor que cpuMin
      const newCpuMax = Math.max(value, config.cpuMin || 1);
      setConfig({ ...config, cpuMax: newCpuMax });
    }
  };

  if (loading) {
    return <div className="config-panel loading">{I18nManager.t('common.loading')}</div>;
  }

  if (!config) {
    return (
      <div className="config-panel error">
        <p>{I18nManager.t('config.no_config')}</p>
      </div>
    );
  }

  return (
    <div className="config-panel">
      <div className="config-header">
        <h2>⚙️ {I18nManager.t('config.title')}</h2>
      </div>

      {statusMessage && (
        <div className={`status-message ${statusMessage.includes('Error') || statusMessage.includes('invalid') ? 'error' : 'success'}`}>
          {statusMessage}
        </div>
      )}

      <div className="config-tabs">
        <button
          className={`tab-button ${editorTab === 'visual' ? 'active' : ''}`}
          onClick={() => setEditorTab('visual')}
        >
          🎛️ {I18nManager.t('config.visual_editor')}
        </button>
        <button
          className={`tab-button ${editorTab === 'text' ? 'active' : ''}`}
          onClick={() => setEditorTab('text')}
        >
          📝 {I18nManager.t('config.text_editor')}
        </button>
      </div>

      {editorTab === 'visual' && (
        <div className="config-visual">
          <div className="resource-section">
            <h3>💾 {I18nManager.t('config.memory')}</h3>

            <div className="resource-item">
              <label>{I18nManager.t('config.ram_min')}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="256"
                  max={systemResources ? systemResources.totalRAM : 8192}
                  step="256"
                  value={config.ramMin}
                  onChange={(e) => handleRamMinChange(parseInt(e.target.value))}
                  className="slider"
                />
                <div className="input-group">
                  <input
                    type="number"
                    min="256"
                    max={systemResources ? systemResources.totalRAM : 8192}
                    step="256"
                    value={config.ramMin}
                    onChange={(e) => handleRamMinChange(parseInt(e.target.value))}
                    className="number-input"
                  />
                  <span className="unit">MB</span>
                </div>
              </div>
              <div className="help-text">{I18nManager.t('config.ram_min_help')}</div>
            </div>

            <div className="resource-item">
              <label>{I18nManager.t('config.ram_max')}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="256"
                  max={systemResources ? systemResources.totalRAM : 16384}
                  step="256"
                  value={config.ramMax}
                  onChange={(e) => handleRamMaxChange(parseInt(e.target.value))}
                  className="slider"
                />
                <div className="input-group">
                  <input
                    type="number"
                    min="256"
                    max={systemResources ? systemResources.totalRAM : 16384}
                    step="256"
                    value={config.ramMax}
                    onChange={(e) => handleRamMaxChange(parseInt(e.target.value))}
                    className="number-input"
                  />
                  <span className="unit">MB</span>
                </div>
              </div>
              <div className="help-text">{I18nManager.t('config.ram_max_help')}</div>
            </div>

            <div className="ram-summary">
              {I18nManager.t('config.ram_summary')}: {config.ramMin / 1024}GB - {config.ramMax / 1024}GB
              {systemResources && (
                <span className="system-info"> (Disponible: {systemResources.totalRAM / 1024}GB)</span>
              )}
            </div>
          </div>

          <div className="resource-section">
            <h3>⚡ {I18nManager.t('config.cpu')}</h3>

            <div className="resource-item">
              <label>{I18nManager.t('config.cpu_min')}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max={systemResources ? systemResources.totalCPUs : 32}
                  step="1"
                  value={config.cpuMin || 1}
                  onChange={(e) => handleCpuMinChange(parseInt(e.target.value))}
                  className="slider"
                />
                <div className="input-group">
                  <input
                    type="number"
                    min="1"
                    max={systemResources ? systemResources.totalCPUs : 32}
                    step="1"
                    value={config.cpuMin || 1}
                    onChange={(e) => handleCpuMinChange(parseInt(e.target.value))}
                    className="number-input"
                  />
                  <span className="unit">{I18nManager.t('config.cores')}</span>
                </div>
              </div>
              <div className="help-text">{I18nManager.t('config.cpu_min_help')}</div>
            </div>

            <div className="resource-item">
              <label>{I18nManager.t('config.cpu_max')}</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max={systemResources ? systemResources.totalCPUs : 32}
                  step="1"
                  value={config.cpuMax || 4}
                  onChange={(e) => handleCpuMaxChange(parseInt(e.target.value))}
                  className="slider"
                />
                <div className="input-group">
                  <input
                    type="number"
                    min="1"
                    max={systemResources ? systemResources.totalCPUs : 32}
                    step="1"
                    value={config.cpuMax || 4}
                    onChange={(e) => handleCpuMaxChange(parseInt(e.target.value))}
                    className="number-input"
                  />
                  <span className="unit">{I18nManager.t('config.cores')}</span>
                </div>
              </div>
              <div className="help-text">{I18nManager.t('config.cpu_max_help')}</div>
            </div>

            {systemResources && (
              <div className="system-info">
                Disponible: {systemResources.totalCPUs} núcleos
              </div>
            )}
          </div>
        </div>
      )}

      {editorTab === 'text' && (
        <div className="config-text">
          <div className="editor-container">
            <textarea
              className="config-editor"
              value={editedJSON}
              onChange={(e) => setEditedJSON(e.target.value)}
              placeholder={I18nManager.t('config.text_placeholder')}
            />
          </div>
          <div className="help-text">
            {I18nManager.t('config.text_editor_help')}
          </div>
        </div>
      )}

      <div className="config-actions">
        <button className="btn-save" onClick={handleSaveConfig}>
          💾 {I18nManager.t('common.save')}
        </button>
        <button className="btn-cancel" onClick={loadConfig}>
          ↺ {I18nManager.t('common.cancel')}
        </button>
      </div>
    </div>
  );
};
