import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../constants/storage.js';

/**
 * 通知中心上下文(UX-10)。
 *
 * <p>简化方案:用 localStorage 持久化通知列表,不引入后端推送。后续如需接 WebSocket/SSE,
 * 只需替换 pushNotification 的数据来源即可。</p>
 *
 * <ul>
 *   <li>持有 notifications 数组,按 createdAt 倒序</li>
 *   <li>提供 push(添加)/markRead(标记已读)/markAllRead/clear/remove/clearAll</li>
 *   <li>unreadCount 派生值供铃铛红点使用</li>
 *   <li>localStorage 同步,跨标签页通过 storage 事件监听</li>
 * </ul>
 *
 * @author songshan.li (ID: 17099618)
 */
const NotificationContext = createContext(null);

const MAX_NOTIFICATIONS = 50;

const safeParse = (raw) => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const loadFromStorage = () => {
  if (typeof window === 'undefined') return [];
  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS));
  } catch {
    return [];
  }
};

const saveToStorage = (list) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  } catch {
    /* quota 超限或隐私模式:静默降级 */
  }
};

/**
 * 通知结构: { id, type, title, body?, to?, read, createdAt }
 * - type: 'info' | 'success' | 'warning' | 'error'
 * - to: 跳转目标路径(可选,点击通知时 navigate)
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => loadFromStorage());
  const idRef = useRef(0);

  // 初始化 id 自增起点(避免新通知与历史 id 冲突)
  useEffect(() => {
    const maxId = notifications.reduce((mx, n) => (n && typeof n.id === 'number' && n.id > mx ? n.id : mx), 0);
    idRef.current = maxId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步到 localStorage
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  // 跨标签页监听 storage 变化
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.NOTIFICATIONS) {
        setNotifications(safeParse(e.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const push = useCallback((opts) => {
    if (!opts || (!opts.title && !opts.body)) return null;
    const id = ++idRef.current;
    const now = Date.now();
    const item = {
      id,
      type: opts.type || 'info',
      title: opts.title || '',
      body: opts.body || '',
      to: opts.to || null,
      read: false,
      createdAt: now
    };
    setNotifications((prev) => {
      const next = [item, ...prev];
      // 封顶,丢弃最旧的
      return next.length > MAX_NOTIFICATIONS ? next.slice(0, MAX_NOTIFICATIONS) : next;
    });
    return id;
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(() => {
    const unreadCount = notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
    return {
      notifications,
      unreadCount,
      push,
      markRead,
      markAllRead,
      remove,
      clearAll
    };
  }, [notifications, push, markRead, markAllRead, remove, clearAll]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications 必须在 NotificationProvider 内使用');
  return ctx;
}
