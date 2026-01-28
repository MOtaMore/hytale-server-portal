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
    window.electron.auth.getCurrentUser().then(user => {
      setIsAuthenticated(!!user);
    });
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
