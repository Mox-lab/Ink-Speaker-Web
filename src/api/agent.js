import api from './client.js';

/**
 * 单轮对话 (/api/chat)
 */
export async function chat(message) {
  const { data } = await api.post('/chat', { message });
  return data.reply;
}

/**
 * 多轮写作 (/api/writing)
 */
export async function writing(userId, message) {
  const { data } = await api.post('/writing', { userId, message });
  return data;
}

/**
 * 大纲生成 (/api/outline)
 * @param theme        主题
 * @param chapters     章节数
 * @param opts.lastOutline   续生模式:上一版大纲尾部文本
 * @param opts.startChapter  续生模式:起始章节号(默认 chapters+1)
 */
export async function outline(theme, chapters = 20, opts = {}) {
  const payload = { theme, chapters };
  if (opts.lastOutline) {
    payload.lastOutline = opts.lastOutline;
    payload.startChapter = opts.startChapter ?? (chapters + 1);
  }
  const { data } = await api.post('/outline', payload);
  return data;
}

/**
 * 章节生成 (/api/chapter)
 */
export async function chapter(sessionId, outlineText, wordCount = 2000) {
  const { data } = await api.post('/chapter', { sessionId, outline: outlineText, wordCount });
  return data;
}

/**
 * 人物抽取 (/api/character)
 */
export async function extractCharacter(text) {
  const { data } = await api.post('/character', { text });
  return data;
}

/**
 * 设定问答 RAG (/api/lore)
 */
export async function loreAsk(question, sessionId = 'lore-001') {
  const { data } = await api.post('/lore', { sessionId, question });
  return data.answer;
}

/**
 * 导入设定库 (/api/lore/import)
 */
export async function importLore(payload) {
  const { data } = await api.post('/lore/import', payload);
  return data;
}

/**
 * 检索调试 (/api/lore/search)
 */
export async function loreSearch(query) {
  const { data } = await api.post('/lore/search', { query });
  return data;
}

/**
 * 多轮记忆测试 (/api/memory)
 */
export async function memoryTest() {
  const { data } = await api.get('/memory');
  return data;
}

/**
 * 章节生成(P1 增强:可传 skillId 强制指定 Skill)。
 */
export async function chapterWithSkill(sessionId, outlineText, skillId, wordCount) {
  const payload = { sessionId, outline: outlineText, wordCount: wordCount ?? 2000 };
  if (skillId) payload.skillId = skillId;
  const { data } = await api.post('/chapter', payload);
  return data;
}

/**
 * 写作助手(P1 增强:可传 skillId)。
 */
export async function writingWithSkill(userId, message, skillId) {
  const payload = { userId, message };
  if (skillId) payload.skillId = skillId;
  const { data } = await api.post('/writing', payload);
  return data;
}

/**
 * P1 — 列出所有可用 Skill。
 */
export async function listSkills() {
  const { data } = await api.get('/skills');
  return data;
}

/**
 * P1 — 预览某段文本会命中哪个 Skill。
 */
export async function previewSkill(text, skillId) {
  const { data } = await api.post('/skills/preview', { text, skillId });
  return data;
}
