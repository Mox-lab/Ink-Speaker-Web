import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { I18nProvider } from './context/I18nContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { TaskProvider } from './context/TaskContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { CommandPaletteProvider, CommandPalette } from './components/CommandPalette.jsx';
import TaskPanel from './components/TaskPanel.jsx';
import { resources } from './i18n/index.js';
import './styles.css';

// 说明:刻意不使用 React.StrictMode。
// StrictMode 在开发模式下会把挂载期 effect 连续执行两次(模拟卸载/重挂),
// 导致页面里的数据请求(列表加载、Skill 加载、大纲/章节节点加载等)被连续调用两次。
// 移除后接口仅在真正挂载时调用一次,符合"接口不应重复调用"的预期。
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <I18nProvider resources={resources}>
        <AuthProvider>
          <NotificationProvider>
            <TaskProvider>
              <CommandPaletteProvider>
                <App />
                <TaskPanel />
                <CommandPalette />
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
              </CommandPaletteProvider>
            </TaskProvider>
          </NotificationProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </BrowserRouter>
);
