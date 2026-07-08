/**
 * 设定页词条 —— 中文
 * @author songshan.li (ID: 17099618)
 */
export const lore = {
  'lore.heading': '设定 RAG',
  'lore.subheading': '向量检索 · 设定库问答 · 知识库导入',
  'lore.tabAsk': '设定问答',
  'lore.tabImport': '导入设定',
  'lore.tabSearch': '检索调试',
  'lore.tabArchive': '设定档案',
  'lore.tabMemory': '记忆面板',
  'lore.session': '会话',
  'lore.sessionHint': '基于设定库的 RAG 问答',
  'lore.awaiting': '等待提问',
  'lore.awaitingHint': '试试:"主角的师父是谁?" 或 "世界观中有哪些势力?"',
  'lore.user': '用户',
  'lore.bot': '设定助手',
  'lore.askFailed': '问答失败',
  'lore.question': '提问',
  'lore.questionPlaceholder': '向设定库提问,Enter 发送',
  'lore.title': '标题',
  'lore.titlePlaceholder': '例:剑宗门规',
  'lore.content': '内容',
  'lore.contentPlaceholder': '支持多段文本,将被分块并向量化入库...',
  'lore.import': '执行导入',
  'lore.importing': '导入中',
  'lore.imported': '已导入设定库',
  'lore.titleRequired': '请输入标题与内容',
  'lore.importFailed': '导入失败',
  'lore.importResult': '导入结果',
  'lore.query': '检索词',
  'lore.queryPlaceholder': '输入检索关键词...',
  'lore.search': '检索',
  'lore.queryRequired': '请输入检索词',
  'lore.searchFailed': '检索失败',
  'lore.hits': '检索结果',
  'lore.hitsAwaiting': '检索结果将在此显示',
  'lore.keywordPlaceholder': '关键词 *',
  'lore.categoryPlaceholder': '分类(通用/势力/地理)',
  'lore.descPlaceholder': '设定描述...',
  'lore.archiveHint': '同一 keyword 覆盖更新',
  'lore.archiveList': '已保存设定',
  'lore.keywordRequired': '请输入关键词',
  'lore.archiveSaved': '已保存',
  'lore.saveFailed': '保存失败',
  'lore.archiveEmpty': '暂无条目 · 点击「刷新」从后端加载',
  'lore.memoryTitle': '长期记忆 · 人物档案',
  'lore.memoryHint': '由 LongTermMemoryExtractor 在章节保存后自动抽取入库',
  'lore.memoryEmpty': '保存章节后将自动抽取人物',
  'lore.architectureTitle': '记忆架构',
  'lore.architecture': `短期记忆  →  ChatMemoryProvider (20 条窗口)  →  章节 Agent / 写作助手
   ↓ 超过 token-budget (6000)
上下文压缩  →  ContextCompactor (复用 PolishAgent 做摘要)  →  压到 3000
   ↓ 章节保存时
长期抽取  →  LongTermMemoryExtractor (@Async)  →  novel_character 表
   ↓ 章节生成前
相关召回  →  RelevantMemoryRetriever (人物 + 时间线 + RAG)  →  拼 prompt`,
};
