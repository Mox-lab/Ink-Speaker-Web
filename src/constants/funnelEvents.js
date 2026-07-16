/**
 * 漏斗事件类型常量(UX-11)。
 *
 * <p>5 个关键节点构成完整漏斗:</p>
 * <ol>
 *   <li>LOGIN             登录成功</li>
 *   <li>CREATE_NOVEL      创建第一本小说</li>
 *   <li>GENERATE_OUTLINE  生成大纲</li>
 *   <li>WRITE_FIRST_CHAPTER 生成第一章正文</li>
 *   <li>SAVE_CHAPTER      保存章节</li>
 * </ol>
 *
 * <p>对应后端 agent_log.event_type 字段,值与 DB 完全一致。</p>
 */
export const FUNNEL_EVENTS = Object.freeze({
  LOGIN: 'funnel.login',
  CREATE_NOVEL: 'funnel.create_novel',
  GENERATE_OUTLINE: 'funnel.generate_outline',
  WRITE_FIRST_CHAPTER: 'funnel.write_first_chapter',
  SAVE_CHAPTER: 'funnel.save_chapter',
});
