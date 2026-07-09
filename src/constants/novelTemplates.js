/**
 * 小说模板库(冷启动引导用)。
 *
 * <p>第 6 阶段 UX-01:新用户首次进入 NovelList 时,空状态除了"从空白创建"
 * 之外,还提供若干预设模板。模板仅做前端预填,不调用后端接口,选定后
 * 跳到 NovelEditor mode="create" 并把 templatePayload 注入初始表单。</p>
 *
 * <p>模板字段说明:</p>
 * <ul>
 *   <li>id:模板唯一标识(本地用,不上传后端)</li>
 *   <li>title:模板显示名(翻译 key 形式 `novel.template.<id>.title`)</li>
 *   <li>genre:类型(玄幻/都市/科幻/悬疑/历史/言情 ...)</li>
 *   <li>tags:标签数组</li>
 *   <li>prefilled:提交给 createNovel 的预填字段(title/author/description/sharedForReference)</li>
 * </ul>
 */
export const NOVEL_TEMPLATES = [
  {
    id: 'xuanhuan-chuancheng',
    genre: 'xuanhuan',
    tags: ['cultivation', 'inheritance', 'battle'],
    prefilled: {
      title: '',
      author: '',
      description:
        '少年意外得到上古传承,从此踏上逆天修炼之路。各大宗门、远古秘境、天地异象交织成一幅宏大的玄幻画卷。',
      sharedForReference: false
    }
  },
  {
    id: 'dushi-zhichang',
    genre: 'urban',
    tags: ['workplace', 'growth', 'realistic'],
    prefilled: {
      title: '',
      author: '',
      description:
        '一名普通职场新人在都市洪流中摸爬滚打,从青涩到成熟的成长故事,聚焦职场关系、生活选择与自我价值。',
      sharedForReference: false
    }
  },
  {
    id: 'kehuan-miewang',
    genre: 'scifi',
    tags: ['postapocalyptic', 'survival', 'civilization'],
    prefilled: {
      title: '',
      author: '',
      description:
        '文明崩塌后的废土之上,幸存者们在变异生物、资源争夺与信仰重建之间挣扎求生,寻找新文明的火种。',
      sharedForReference: false
    }
  },
  {
    id: 'xuanyi-tuili',
    genre: 'mystery',
    tags: ['deduction', 'suspense', 'crime'],
    prefilled: {
      title: '',
      author: '',
      description:
        '一桩看似寻常的案件背后,牵出跨越多年的隐秘。侦探与罪犯在心理博弈中互相逼近真相。',
      sharedForReference: false
    }
  },
  {
    id: 'lishi-chaoye',
    genre: 'history',
    tags: ['time-travel', 'court', 'strategy'],
    prefilled: {
      title: '',
      author: '',
      description:
        '现代人穿越到乱世,凭借历史知识与超越时代的视野,在朝堂与沙场之间谋图霸业。',
      sharedForReference: false
    }
  },
  {
    id: 'yanqing-jiuri',
    genre: 'romance',
    tags: ['healing', 'modern', 'sweet'],
    prefilled: {
      title: '',
      author: '',
      description:
        '两个受伤的灵魂在偶然相遇后彼此治愈,从陌生到相依,细水长流的现代治愈系爱情。',
      sharedForReference: false
    }
  }
];

/**
 * 模板的类型分组(用于 NovelTemplatePicker 顶部分类筛选)。
 */
export const TEMPLATE_GENRES = [
  { key: 'all', labelKey: 'novel.template.category.all' },
  { key: 'xuanhuan', labelKey: 'novel.template.genre.xuanhuan' },
  { key: 'urban', labelKey: 'novel.template.genre.urban' },
  { key: 'scifi', labelKey: 'novel.template.genre.scifi' },
  { key: 'mystery', labelKey: 'novel.template.genre.mystery' },
  { key: 'history', labelKey: 'novel.template.genre.history' },
  { key: 'romance', labelKey: 'novel.template.genre.romance' }
];
