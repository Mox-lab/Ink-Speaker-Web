import { useNovelContext, useRequireNovelId } from '../context/NovelContext.jsx';

/**
 * 业务页面取当前小说 ID 的统一入口。
 *
 * <p>第 6 阶段(以小说为主体):所有子资源页(Outline/Chapter/Character/Lore/Polish)
 * 必须通过此 hook 取 novelId,而不是从 constants/app.js 的 DEFAULT_NOVEL_ID 兜底。</p>
 *
 * <p>用法:</p>
 * <pre>
 *   const novelId = useNovelId();           // 在已选小说的工作台子页面
 *   const draftKey = draftKeyFn(STORAGE_KEYS.DRAFT_OUTLINE, novelId);
 * </pre>
 *
 * @returns {number} 当前小说 ID(无小说时抛错,业务页应保证在 NovelWorkspace 路由下调用)
 */
export function useNovelId() {
  return useRequireNovelId();
}

export { useNovelContext };
