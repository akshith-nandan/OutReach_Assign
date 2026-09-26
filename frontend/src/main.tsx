import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './app/globals.css';
import RootLayout from './app/layout';
import DashboardPage from './app/page';
import LoginPage from './app/login/page';

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <RootLayout>
      {path === '/login' ? <LoginPage /> : <DashboardPage />}
    </RootLayout>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);