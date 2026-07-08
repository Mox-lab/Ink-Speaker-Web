import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants/storage.js';
import { loadLocal, saveLocal } from '../utils/storage.js';

const SUPPORTED = ['zh', 'en'];
const DEFAULT_LANG = 'zh';

function detectInitialLang() {
  const saved = loadLocal(STORAGE_KEYS.LANG);
  if (typeof saved === 'string' && SUPPORTED.includes(saved)) return saved;
  // 默认中文
  return DEFAULT_LANG;
}

const I18nContext = createContext(null);

export function I18nProvider({ children, resources }) {
  const [lang, setLang] = useState(detectInitialLang);

  useEffect(() => {
    saveLocal(STORAGE_KEYS.LANG, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key, fallback) => {
      const dict = resources[lang] || {};
      const value = dict[key];
      if (value != null && value !== '') return value;
      // 回退顺序:当前语言 → 默认语言 → fallback → key 本身
      const fallbackDict = resources[DEFAULT_LANG] || {};
      const fb = fallbackDict[key];
      if (fb != null && fb !== '') return fb;
      if (fallback != null) return fallback;
      return key;
    },
    [lang, resources]
  );

  const toggle = useCallback(() => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  }, []);

  const value = { lang, setLang, toggle, t, isZh: lang === 'zh', isEn: lang === 'en' };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n 必须在 I18nProvider 内使用');
  return ctx;
}
