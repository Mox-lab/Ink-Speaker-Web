/**
 * 主题上下文 —— 管理三套主题的切换与持久化。
 *
 * 主题列表:
 *   - scifi   科幻风(默认):深空黑 + 青蓝荧光 + HUD 网格
 *   - linear  Linear 风:近纯黑 + 靛紫 + 毛玻璃 + 微噪点(参考 linear.app)
 *   - stripe  Stripe 风:纯白底 + 靛蓝渐变 + 柔和阴影(参考 stripe.com)
 *
 * @author songshan.li (ID: 17099618)
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storage.js';
import { loadLocal, saveLocal } from '../utils/storage.js';

/** 可用主题列表(顺序即 UI 展示顺序) */
export const THEMES = [
  { id: 'scifi', labelZh: '科幻', labelEn: 'Sci-Fi', icon: 'sparkles' },
  { id: 'linear', labelZh: 'Linear', labelEn: 'Linear', icon: 'layers' },
  { id: 'stripe', labelZh: 'Stripe', labelEn: 'Stripe', icon: 'credit-card' },
];

const DEFAULT_THEME = 'scifi';

function detectInitialTheme() {
  const saved = loadLocal(STORAGE_KEYS.THEME);
  if (typeof saved === 'string' && THEMES.some((t) => t.id === saved)) return saved;
  return DEFAULT_THEME;
}

const ThemeContext = createContext(null);

/**
 * 主题 Provider。将 data-theme 写入 <html>,使全局 CSS 变量级联生效。
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(detectInitialTheme);

  useEffect(() => {
    saveLocal(STORAGE_KEYS.THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const changeTheme = useCallback((next) => {
    if (THEMES.some((t) => t.id === next)) setTheme(next);
  }, []);

  /** 循环切换到下一个主题(供快捷键 / 单击切换) */
  const cycle = useCallback(() => {
    const idx = THEMES.findIndex((t) => t.id === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next.id);
  }, [theme]);

  const value = {
    theme,
    themes: THEMES,
    setTheme: changeTheme,
    cycle,
    isScifi: theme === 'scifi',
    isLinear: theme === 'linear',
    isStripe: theme === 'stripe',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * 获取主题上下文。
 * @returns {{theme: string, themes: Array, setTheme: Function, cycle: Function, isScifi: boolean, isLinear: boolean, isStripe: boolean}}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用');
  return ctx;
}
