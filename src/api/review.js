import api from './client.js';

/**
 * 章节审查接口 (/api/review/**)。
 * DirectorAgent 协作产物。
 */

/** 列出某章的审查问题。 */
export async function listReviewIssues(chapterNo) {
  const { data } = await api.get(`/review/chapter/${chapterNo}`);
  return data;
}

/** 列出当前小说全部未解决审查问题。 */
export async function listOpenReviewIssues() {
  const { data } = await api.get('/review/open');
  return data;
}

/** 手动触发某章审查(传入章节正文)。 */
export async function triggerReview(chapterNo, content) {
  const { data } = await api.post(`/review/chapter/${chapterNo}`, { content });
  return data;
}

/** 更新审查问题状态(open / resolved / ignored)。 */
export async function updateReviewStatus(id, status) {
  const { data } = await api.patch(`/review/${id}`, { status });
  return data;
}
