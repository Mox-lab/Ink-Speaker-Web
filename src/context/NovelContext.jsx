import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getActiveNovelId, setActiveNovelId as setClientNovelId } from '../api/client.js';
import { STORAGE_KEYS } from '../constants/storage.js';

/**
 * 小说上下文。
 *
 * <p>第 6 阶段(以小说为主体):</p>
 * <ul>
 *   <li>持有当前活跃 novelId,在 NovelWorkspace 路由下由 URL 的 :novelId 驱动</li>
 *   <li>切换小说时同步到 api/client.js,使请求拦截器自动注入 X-Novel-Id 头</li>
 *   <li>同步到 localStorage,刷新页面后仍能恢复</li>
 *   <li>跨小说页面(如 /novels 列表、/chat 问答)允许 novelId 为 null</li>
 * </ul>
 */
const NovelContext = createContext(null);

export function NovelProvider({ children }) {
  const [novelId, setNovelId] = useState(() => getActiveNovelId());

  // 同步到 client + localStorage
  useEffect(() => {
    setClientNovelId(novelId);
  }, [novelId]);

  const setActiveNovelId = useCallback((id) => {
    setNovelId(id || null);
  }, []);

  const clearActiveNovelId = useCallback(() => {
    setNovelId(null);
  }, []);

  const value = useMemo(
    () => ({
      novelId,
      setActiveNovelId,
      clearActiveNovelId,
      hasActiveNovel: novelId != null
    }),
    [novelId, setActiveNovelId, clearActiveNovelId]
  );

  return <NovelContext.Provider value={value}>{children}</NovelContext.Provider>;
}

export function useNovelContext() {
  const ctx = useContext(NovelContext);
  if (!ctx) throw new Error('useNovelContext 必须在 NovelProvider 内使用');
  return ctx;
}

/**
 * 强约束 hook:必须在已选小说的上下文内调用,否则抛错。
 * <p>供业务页(Outline/Chapter/Character/Lore 等)使用,确保不会在未选小说时
 * 发起子资源请求。</p>
 *
 * @param {string} [errorMessage] 自定义错误提示
 * @returns {number} 当前小说 ID
 */
export function useRequireNovelId(errorMessage) {
  const ctx = useContext(NovelContext);
  if (!ctx) throw new Error(errorMessage || 'useRequireNovelId 必须在 NovelProvider 内使用');
  if (ctx.novelId == null) {
    throw new Error(errorMessage || 'novel.context.unset');
  }
  return ctx.novelId;
}

// 复用 storage 常量,保持单一来源
export { STORAGE_KEYS };
