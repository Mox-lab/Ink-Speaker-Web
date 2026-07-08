import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { I18nProvider } from './context/I18nContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { resources } from './i18n/index.js';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider resources={resources}>
          <AuthProvider>
            <App />
            <Toaster
              theme="dark"
              position="top-right"
              toastOptions={{
                style: {
                  background: 'rgba(20, 12, 40, 0.85)',
                  border: '1px solid rgba(140, 110, 220, 0.3)',
                  color: '#e7e3ff',
                  backdropFilter: 'blur(8px)'
                }
              }}
            />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
