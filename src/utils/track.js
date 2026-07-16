import api from '../api/client.js';

/**
 * 前端漏斗埋点工具(UX-11)。
 *
 * <p>约定:</p>
 * <ul>
 *   <li>fire-and-forget:上报失败仅 console.warn,不抛出、不阻塞主流程</li>
 *   <li>不等待 Promise:调用方直接继续业务逻辑</li>
 *   <li>POST /api/track 由后端记录到 agent_log 表</li>
 * </ul>
 */

/**
 * 上报一条漏斗事件。
 * @param {string} eventType 事件类型,例如 funnel.login
 * @param {Object} [props] 附加属性
 * @param {number} [novelId] 关联小说 id
 */
export function trackEvent(eventType, props, novelId) {
  if (!eventType) return;
  const payload = { eventType };
  if (novelId != null) payload.novelId = novelId;
  if (props && typeof props === 'object') payload.props = props;

  // 不 await,只 catch 错误
  Promise.resolve(
    api.post('/track', payload).catch((err) => {
      // 埋点失败绝不能影响业务,仅打 warn
      // eslint-disable-next-line no-console
      console.warn('[track] failed:', eventType, err?.message || err);
    })
  );
}
