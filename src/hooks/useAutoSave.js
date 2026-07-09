import { useEffect, useRef, useState } from 'react';
import { saveDraft, clearDraft } from '../utils/storage.js';

/**
 * UX-05 自动保存与草稿恢复。
 *
 * <p>节流策略:内容变化后 {@code interval}(默认 5s)内若再无新变化,触发一次保存;
 * 持续输入不会高频写 storage。首次挂载不会触发保存(避免覆盖已有草稿)。</p>
 *
 * <p>状态机:</p>
 * <ul>
 *   <li>{@code idle} —— 无未保存变更</li>
 *   <li>{@code pending} —— 有变更,等待 debounce 触发</li>
 *   <li>{@code saving} —— 正在写入(同步 sessionStorage 极快,但仍标记以驱动 UI)</li>
 *   <li>{@code saved} —— 刚写入完成(2s 后回到 idle)</li>
 *   <li>{@code error} —— 写入异常(实际很少触发,saveDraft 内部已 try/catch)</li>
 * </ul>
 *
 * <p>调用方约定:</p>
 * <ul>
 *   <li>当后端保存成功后,调用 {@link #clear} 清除草稿</li>
 *   <li>进入页面挂载时,调用方应自行 {@code loadDraft(key)} 比对草稿与后端 updated_at,
 *       决定是否弹「恢复草稿」提示(本 hook 不弹 UI,避免与具体页面耦合)</li>
 * </ul>
 *
 * @param {*} value         需要自动保存的内容(任意可序列化值)
 * @param {string} key      STORAGE_KEYS 中的某个 DRAFT_* key(已通过 draftKey 拼好)
 * @param {object} [opts]
 * @param {number} [opts.interval=5000] 节流间隔 ms
 * @param {boolean} [opts.enabled=true] 是否启用(可用于在 loading 态临时禁用)
 * @returns {{
 *   status: 'idle'|'pending'|'saving'|'saved'|'error',
 *   save: () => void,    // 立即触发一次保存(跳过 debounce)
 *   clear: () => void    // 清除草稿(通常在后端保存成功后调用)
 * }}
 */
export function useAutoSave(value, key, opts = {}) {
  const { interval = 5000, enabled = true } = opts;
  const [status, setStatus] = useState('idle');
  const first = useRef(true);
  const timer = useRef(null);
  const lastSaved = useRef(null);

  // 节流保存:值变化时若启用,启动/重置 timer
  useEffect(() => {
    if (!enabled) return;
    // 首次挂载不触发保存,避免覆盖已有草稿
    if (first.current) {
      first.current = false;
      lastSaved.current = value;
      return;
    }
    // 内容为空时直接清草稿,不进入 pending 态
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
      if (timer.current) clearTimeout(timer.current);
      clearDraft(key);
      setStatus('idle');
      lastSaved.current = value;
      return;
    }
    setStatus('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        saveDraft(key, value);
        lastSaved.current = value;
        setStatus('saving');
        // sessionStorage 同步写入极快,2s 后回到 saved,再 2s 回 idle
        setTimeout(() => setStatus('saved'), 50);
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
      }
    }, interval);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, key, interval, enabled]);

  /** 立即触发保存(跳过 debounce) */
  const save = () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      saveDraft(key, value);
      lastSaved.current = value;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  };

  /** 清除草稿(后端保存成功后调用) */
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    clearDraft(key);
    setStatus('idle');
    lastSaved.current = null;
  };

  return { status, save, clear };
}
