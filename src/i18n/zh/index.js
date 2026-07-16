/**
 * 中文词条聚合 —— 合并所有模块的中文翻译。
 * @author songshan.li (ID: 17099618)
 */
import { common } from './common.js';
import { login } from './login.js';
import { nav } from './nav.js';
import { chat } from './chat.js';
import { writing } from './writing.js';
import { outline } from './outline.js';
import { chapter } from './chapter.js';
import { character } from './character.js';
import { lore } from './lore.js';
import { memory } from './memory.js';
import { review } from './review.js';
import { theme } from './theme.js';
import { novel } from './novel.js';
import { admin } from './admin.js';

/** 中文完整词典 */
export const zh = {
  ...common,
  ...login,
  ...nav,
  ...chat,
  ...writing,
  ...outline,
  ...chapter,
  ...character,
  ...lore,
  ...memory,
  ...review,
  ...theme,
  ...novel,
  ...admin,
};
