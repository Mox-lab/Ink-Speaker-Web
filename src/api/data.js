import api from './client.js';

/**
 * 业务数据 CRUD (/api/data/**)。
 * <p>novelId 由 client.js 请求拦截器统一通过 X-Novel-Id 头注入,
 * 业务层无需再显式传递 novelId。下列方法仅保留 path 参数版本以兼容旧调用。</p>
 * <p>注意:Spring 7 严格路径匹配,URL 末尾不能带斜杠,
 * 否则后端返回 NoResourceFoundException。所有 `${novelId || ''}` 拼接
 * 必须做尾斜杠保护:当 novelId 为空时去掉末尾斜杠。</p>
 */

/**
 * 安全拼接 path 参数,避免末尾出现空斜杠。
 * - listOutlines()       → /data/outline
 * - listOutlines(5)      → /data/outline/5
 * - listOutlines(undefined) → /data/outline
 */
function path(base, id) {
  if (id === undefined || id === null || id === '') return base;
  return `${base}/${id}`;
}

/* ============== 小说 ============== */

/** 列出当前用户的小说(R5 用户隔离)。 */
export async function listNovels() {
  const { data } = await api.get('/data/novel');
  return data;
}

/** 列出公共参考池小说(脱敏)。 */
export async function listSharedNovels() {
  const { data } = await api.get('/data/novel/shared');
  return data;
}

/**
 * 取公共参考池中某本小说的只读详情(BASE-09)。
 * 聚合脱敏基础信息 + 全部章节摘要 + 大纲版本 + 人物 + 设定。
 * @param {number|string} id 小说 ID
 * @returns {Promise<Object>} SharedNovelBrowseVo
 */
export async function getSharedNovelBrowse(id) {
  const { data } = await api.get(`/data/novel/shared/${id}`);
  return data;
}

/** 创建新小说。 */
export async function createNovel(payload) {
  const { data } = await api.post('/data/novel', payload);
  return data;
}

/** 取单本小说基础信息。 */
export async function getNovel(id) {
  const { data } = await api.get(`/data/novel/${id}`);
  return data;
}

/** 更新小说基础信息。 */
export async function updateNovel(id, payload) {
  const { data } = await api.put(`/data/novel/${id}`, payload);
  return data;
}

/** 删除小说(级联删除全部子表)。 */
export async function deleteNovel(id) {
  const { data } = await api.delete(`/data/novel/${id}`);
  return data;
}

/** 取小说概览(基础信息 + 各子模块统计 + 最近章节/大纲列表)。 */
export async function getNovelOverview(id) {
  const { data } = await api.get(`/data/novel/${id}/overview`);
  return data;
}

/**
 * AI 续写建议(BASE-12)。
 * <p>基于最近章节、激活大纲与人物档案预测下一章走向,返回结构化建议。
 * 同步阻塞调用,前端按需触发(总览页"AI 续写建议"按钮)。</p>
 *
 * @param {number|string} id 小说 ID
 * @returns {Promise<Object>} ContinuationSuggestionVo
 */
export async function getContinuationSuggestion(id) {
  const { data } = await api.get(`/data/novel/${id}/continuation`);
  return data;
}

/**
 * 导出小说(BASE-10)。
 * <p>返回二进制流(blob),前端用 URL.createObjectURL 触发下载。
 * format: 'md' | 'txt' | 'json',默认 'md'。</p>
 * <p>注意:此处不走响应拦截器的 Result 解包逻辑,因后端直接返回 byte[],
 * 需显式指定 responseType: 'blob'。</p>
 *
 * @param {number|string} id 小说 ID
 * @param {string} [format] 文件格式 md/txt/json
 * @returns {Promise<{blob: Blob, filename: string}>} 二进制内容 + 服务器侧建议的文件名
 */
export async function exportNovel(id, format) {
  const params = format ? { format } : undefined;
  const resp = await api.get(`/data/novel/${id}/export`, {
    params,
    responseType: 'blob'
  });
  // 从 Content-Disposition 解析文件名,失败时退化为本地组装
  let filename = '';
  const cd = resp.headers?.['content-disposition'];
  if (cd) {
    const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    if (star && star[1]) {
      try {
        filename = decodeURIComponent(star[1]);
      } catch {
        filename = star[1];
      }
    } else {
      const plain = /filename="?([^";]+)"?/i.exec(cd);
      if (plain && plain[1]) filename = plain[1];
    }
  }
  if (!filename) {
    const ext = format || 'md';
    filename = `novel-${id}.${ext}`;
  }
  return { blob: resp.data, filename };
}

/* ============== 大纲 ============== */

/** 列出当前小说全部版本(novelId 走 X-Novel-Id 头)。 */
export async function listOutlines(novelId) {
  const { data } = await api.get(path('/data/outline', novelId));
  return data;
}

/** 获取某版本全文。 */
export async function getOutline(id) {
  const { data } = await api.get(`/data/outline/detail/${id}`);
  return data;
}

/** 获取当前激活版本(用于续生)。 */
export async function getActiveOutline(novelId) {
  const { data } = await api.get(path('/data/outline/active', novelId));
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
  const { data } = await api.get(path('/data/chapter', novelId));
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
  const { data } = await api.get(path('/data/character', novelId));
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

/**
 * 按名字模糊搜索人物(UX-06 写作侧边栏 @人物检索)。
 * @param {string} [name] 姓名片段,空串返回全部
 * @returns {Promise<Array>} 匹配的人物列表
 */
export async function searchCharactersByName(name) {
  const { data } = await api.get('/data/character/by-name', { params: { name } });
  return data;
}

/**
 * 列出某人物出现的章节摘要(UX-06 人物卡片点击查看出现位置)。
 * @param {number} characterId 人物 ID
 * @returns {Promise<Array>} 章节摘要列表(按章节序号升序)
 */
export async function listCharacterAppears(characterId) {
  const { data } = await api.get('/data/character/appears', { params: { characterId } });
  return data;
}

/* ============== 世界观设定 ============== */

/** 列出当前小说全部。 */
export async function listSettings(novelId) {
  const { data } = await api.get(path('/data/setting', novelId));
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

/**
 * 按关键词模糊搜索世界观设定(UX-06 写作侧边栏设定 RAG 检索)。
 * @param {string} [keyword] 关键词片段,空串返回全部
 * @returns {Promise<Array>} 匹配的设定列表
 */
export async function searchSettings(keyword) {
  const { data } = await api.get('/data/setting/search', { params: { keyword } });
  return data;
}

/* ============== 章节历史版本快照(BASE-07) ============== */

/**
 * 列出某章节的全部历史快照(按时间倒序)。
 * @param {number} chapterId 章节 ID
 * @returns {Promise<Array>} 历史快照列表
 */
export async function listChapterHistory(chapterId) {
  const { data } = await api.get('/data/chapter/history', { params: { chapterId } });
  return data;
}

/**
 * 取某条历史快照详情(含正文全文)。
 * @param {number} historyId 历史 ID
 * @returns {Promise<Object>} 历史快照详情
 */
export async function getChapterHistoryDetail(historyId) {
  const { data } = await api.get(`/data/chapter/history/${historyId}`);
  return data;
}
