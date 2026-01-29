import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import MainPage from './pages/MainPage';

/**
 * Componente raíz de la aplicación
 * Maneja la navegación entre página de autenticación y panel principal
 */
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authPageKey, setAuthPageKey] = useState(0);
  const [sessionType, setSessionType] = useState<'local' | 'remote' | null>(null);

  useEffect(() => {
    // Verificar si hay usuario autenticado al iniciar
    const checkAuth = async () => {
      // Primero verificar sesión remota en localStorage
      const remoteSessionStr = localStorage.getItem('remoteSession');
      console.log('[App] Checking authentication... remoteSession exists:', !!remoteSessionStr);
      
      if (remoteSessionStr) {
        try {
          const remoteSession = JSON.parse(remoteSessionStr);
          // Verificar que la sesión no expire (24 horas)
          const sessionAge = Date.now() - remoteSession.timestamp;
          const sessionAgeHours = Math.round(sessionAge / (60 * 60 * 1000));
          console.log('[App] Remote session found, age:', sessionAgeHours, 'hours');
          console.log('[App] Remote session has token:', !!remoteSession.token);
          console.log('[App] Remote session has connectionString:', !!remoteSession.connectionString);
          
          if (sessionAge < 24 * 60 * 60 * 1000 && remoteSession.token && remoteSession.connectionString) {
            console.log('[App] Remote session valid, authenticating...');
            setSessionType('remote');
            setIsAuthenticated(true);
            return;
          } else {
            // Sesión expirada
            console.log('[App] Remote session invalid/expired, clearing...');
            localStorage.removeItem('remoteSession');
          }
        } catch (e) {
          console.error('[App] Invalid remote session:', e);
          localStorage.removeItem('remoteSession');
        }
      }

      // Si no hay sesión remota válida, verificar usuario local
      const user = await window.electron.auth.getCurrentUser();
      if (user) {
        console.log('[App] Local session found');
        setSessionType('local');
        setIsAuthenticated(true);
      } else {
        console.log('[App] No session found');
        setSessionType(null);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    // Limpiar ambas sesiones posibles
    localStorage.removeItem('remoteSession');
    setSessionType(null);
    setIsAuthenticated(false);
    setAuthPageKey(prev => prev + 1); // Force re-render AuthPage
  };

  if (isAuthenticated === null) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div>Cargando...</div>
    </div>;
  }

  return isAuthenticated ? (
    <MainPage onLogout={handleLogout} sessionType={sessionType} />
  ) : (
    <AuthPage
      key={authPageKey}
      onAuthenticated={(type) => {
        setSessionType(type);
        setIsAuthenticated(true);
      }}
    />
  );
}
