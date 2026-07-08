import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../constants/storage.js';
import { loadLocal } from '../utils/storage.js';

/**
 * Token 用量统计 Hook。
 * 监听 localStorage 中的 ink_speaker_token_log,聚合 calls / chars / 预估 tokens。
 */
export function useTokenUsage() {
  const [usage, setUsage] = useState({ calls: 0, chars: 0, tokens: 0, entries: [] });

  useEffect(() => {
    const calc = () => {
      const arr = loadLocal(STORAGE_KEYS.TOKEN_LOG) || [];
      const chars = arr.reduce((sum, e) => sum + (e.chars || 0), 0);
      const tokens = arr.reduce((sum, e) => sum + (e.tokens || 0), 0);
      setUsage({ calls: arr.length, chars, tokens, entries: arr });
    };
    calc();
    window.addEventListener('storage', calc);
    return () => window.removeEventListener('storage', calc);
  }, []);

  return usage;
}
