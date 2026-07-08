/**
 * localStorage / sessionStorage key 统一管理。
 * 禁止在业务代码中硬编码字符串 key,统一从此文件引用。
 */
export const STORAGE_KEYS = {
  // 鉴权
  ACCESS_TOKEN: 'ink_speaker_access_token',
  REFRESH_TOKEN: 'ink_speaker_refresh_token',

  // 用户偏好
  LANG: 'ink_speaker_lang',
  THEME: 'ink_speaker_theme',
  ACTIVE_NOVEL_ID: 'ink_speaker_active_novel_id',

  // 用量统计(跨页面共享)
  TOKEN_LOG: 'ink_speaker_token_log',

  // 草稿持久化(sessionStorage,关闭即清)
  DRAFT_OUTLINE: 'ink_speaker_outline_state',
  DRAFT_CHAPTER: 'ink_speaker_chapter_state',
  DRAFT_CHARACTER: 'ink_speaker_character_state',
};
