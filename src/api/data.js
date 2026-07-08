import api from './client.js';

/**
 * 业务数据 CRUD (/api/data/**)。
 * <p>novelId 由 client.js 请求拦截器统一通过 X-Novel-Id 头注入,
 * 业务层无需再显式传递 novelId。下列方法仅保留 path 参数版本以兼容旧调用。</p>
 */

/* ============== 小说 ============== */

/** 列出全部小说。 */
export async function listNovels() {
  const { data } = await api.get('/data/novel');
  return data;
}

/* ============== 大纲 ============== */

/** 列出当前小说全部版本(novelId 走 X-Novel-Id 头)。 */
export async function listOutlines(novelId) {
  const { data } = await api.get(`/data/outline/${novelId || ''}`);
  return data;
}

/** 获取某版本全文。 */
export async function getOutline(id) {
  const { data } = await api.get(`/data/outline/detail/${id}`);
  return data;
}

/** 获取当前激活版本(用于续生)。 */
export async function getActiveOutline(novelId) {
  const { data } = await api.get(`/data/outline/active/${novelId || ''}`);
  return data;
}

/** 保存(新建版本)。novelId 由后端 NovelContext 兜底。 */
export async function saveOutline(payload) {
  const { data } = await api.post('/data/outline/save', payload);
  return data;
}

/** 激活某历史版本。 */
export async function activateOutline(id, novelId) {
  const { data } = await api.post('/data/outline/activate', { id, novelId });
  return data;
}

/** 删除某版本。 */
export async function deleteOutline(id) {
  const { data } = await api.delete(`/data/outline/${id}`);
  return data;
}

/* ============== 章节 ============== */

/** 列出当前小说全部章节(摘要)。 */
export async function listChapters(novelId) {
  const { data } = await api.get(`/data/chapter/${novelId || ''}`);
  return data;
}

/** 获取某章全文。 */
export async function getChapter(id) {
  const { data } = await api.get(`/data/chapter/detail/${id}`);
  return data;
}

/** 保存(同 novelId+chapterNo 覆盖)。 */
export async function saveChapter(payload) {
  const { data } = await api.post('/data/chapter/save', payload);
  return data;
}

/** 删除。 */
export async function deleteChapter(id) {
  const { data } = await api.delete(`/data/chapter/${id}`);
  return data;
}

/* ============== 人物 ============== */

/** 列出当前小说全部。 */
export async function listCharacters(novelId) {
  const { data } = await api.get(`/data/character/${novelId || ''}`);
  return data;
}

/** 批量保存。 */
export async function saveCharactersBatch(characters, novelId) {
  const { data } = await api.post('/data/character/save-batch', { novelId, characters });
  return data;
}

/** 删除。 */
export async function deleteCharacter(id) {
  const { data } = await api.delete(`/data/character/${id}`);
  return data;
}

/* ============== 世界观设定 ============== */

/** 列出当前小说全部。 */
export async function listSettings(novelId) {
  const { data } = await api.get(`/data/setting/${novelId || ''}`);
  return data;
}

/** 保存单条。 */
export async function saveSetting(payload) {
  const { data } = await api.post('/data/setting/save', payload);
  return data;
}

/** 删除。 */
export async function deleteSetting(id) {
  const { data } = await api.delete(`/data/setting/${id}`);
  return data;
}
