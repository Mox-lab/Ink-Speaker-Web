/**
 * localStorage / sessionStorage key 统一管理。
 * 禁止在业务代码中硬编码字符串 key,统一从此文件引用。
 *
 * <p>第 6 阶段(以小说为主体):草稿类 key 改为按 novelId 拼接,
 * 见 {@link #draftKey}。原 DRAFT_* 常量仅作前缀,不可直接作为 storage key 使用。</p>
 */
export const STORAGE_KEYS = {
  // 鉴权
  ACCESS_TOKEN: 'ink_realm_access_token',
  REFRESH_TOKEN: 'ink_realm_refresh_token',

  // 用户偏好
  LANG: 'ink_realm_lang',
  THEME: 'ink_realm_theme',
  ACTIVE_NOVEL_ID: 'ink_realm_active_novel_id',

  // 用量统计(跨页面共享)
  TOKEN_LOG: 'ink_realm_token_log',

  // 草稿持久化(sessionStorage,按 novelId 隔离)
  // 业务代码应使用 draftKey(STORAGE_KEYS.DRAFT_*, novelId) 拼出最终 key
  DRAFT_OUTLINE: 'ink_realm_outline_state',
  DRAFT_CHAPTER: 'ink_realm_chapter_state',
  DRAFT_CHARACTER: 'ink_realm_character_state',

  // 最近访问的小说列表(localStorage,跨会话保留)
  RECENT_NOVELS: 'ink_realm_recent_novels',

  // 通知中心(localStorage,简化方案:不引入后端推送)
  NOTIFICATIONS: 'ink_realm_notifications',
};

/**
 * 按小说 ID 拼接草稿 storage key。
 *
 * <p>不同小说的草稿互相隔离,避免切换小说时旧草稿覆盖新小说的初始状态。
 * 当 novelId 缺失(理论上不应出现,因为业务页都从 NovelContext 取)时,
 * 回退到旧前缀以保持兼容,但会在控制台打 warning 提示排查。</p>
 *
 * @param {string} prefix STORAGE_KEYS.DRAFT_OUTLINE / DRAFT_CHAPTER / DRAFT_CHARACTER
 * @param {number|string} novelId 当前小说 ID
 * @returns {string} 拼接后的 storage key
 */
export const draftKey = (prefix, novelId) => {
  if (!novelId) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[storage] draftKey called without novelId, falling back to legacy key:', prefix);
    }
    return prefix;
  }
  return `${prefix}__${novelId}`;
};
