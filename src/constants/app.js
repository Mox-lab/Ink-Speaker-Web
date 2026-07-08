/**
 * 应用级常量。
 */

/**
 * 默认小说 ID。
 * <p>仅在前端本地兜底场景使用(如未通过 NovelProvider 注入时)。
 * 后端已通过 X-Novel-Id 头 + NovelContext 上下文化,前端默认会在请求拦截器中
 * 注入此 header,业务代码无需在每个 API 调用中显式传 novelId。</p>
 */
export const DEFAULT_NOVEL_ID = 1;
