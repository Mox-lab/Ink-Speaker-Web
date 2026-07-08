import { useEffect, useRef, useState } from 'react';
import { loadDraft, saveDraft, clearDraft } from '../utils/storage.js';

/**
 * 草稿持久化 Hook。
 * 自动同步状态到 sessionStorage,组件卸载/重挂可恢复。
 *
 * @param {string} key STORAGE_KEYS 中的 DRAFT_* key
 * @param {*} initial 初始值(无草稿时使用)
 * @returns [state, setState, clear]
 */
export function useDraft(key, initial = null) {
  const [state, setState] = useState(() => loadDraft(key) ?? initial);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (state == null) {
      clearDraft(key);
    } else {
      saveDraft(key, state);
    }
  }, [key, state]);

  const clear = () => {
    clearDraft(key);
    setState(initial);
  };

  return [state, setState, clear];
}
