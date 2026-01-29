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

  useEffect(() => {
    // Verificar si hay usuario autenticado al iniciar
    const checkAuth = async () => {
      // Primero verificar sesión remota en localStorage
      const remoteSessionStr = localStorage.getItem('remoteSession');
      if (remoteSessionStr) {
        try {
          const remoteSession = JSON.parse(remoteSessionStr);
          // Verificar que la sesión no expire (24 horas)
          const sessionAge = Date.now() - remoteSession.timestamp;
          if (sessionAge < 24 * 60 * 60 * 1000 && remoteSession.token) {
            console.log('[App] Remote session found, authenticating...');
            setIsAuthenticated(true);
            return;
          } else {
            // Sesión expirada
            localStorage.removeItem('remoteSession');
          }
        } catch (e) {
          console.error('[App] Invalid remote session:', e);
          localStorage.removeItem('remoteSession');
        }
      }

      // Si no hay sesión remota válida, verificar usuario local
      const user = await window.electron.auth.getCurrentUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthPageKey(prev => prev + 1); // Force re-render AuthPage
  };

  if (isAuthenticated === null) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div>Cargando...</div>
    </div>;
  }

  return isAuthenticated ? (
    <MainPage onLogout={handleLogout} />
  ) : (
    <AuthPage key={authPageKey} onAuthenticated={() => setIsAuthenticated(true)} />
  );
}
