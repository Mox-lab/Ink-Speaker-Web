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
 *   <li>prefilled.characters:预填人物(创建后串行写入)</li>
 *   <li>prefilled.worldSettings:预填世界观设定(创建后串行写入)</li>
 *   <li>prefilled.outline:预填大纲(创建后串行写入,自动激活)</li>
 * </ul>
 *
 * @author songshan.li (ID: 17099618)
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
      sharedForReference: false,
      characters: [
        {
          name: '林凡',
          age: 18,
          gender: '男',
          personality: '坚韧沉稳,恩怨分明',
          background: '青云镇普通少年,父母早亡,由爷爷抚养',
          weapon: '上古青铜剑',
          identity: '传承者',
          appearance: '黑发束起,目光清澈',
          relationships: { 苏婉: '青梅竹马', 墨老: '师徒' }
        },
        {
          name: '苏婉',
          age: 17,
          gender: '女',
          personality: '温柔聪慧,外柔内刚',
          background: '青云镇苏家独女,天赋出众',
          weapon: '玉笛',
          identity: '苏家小姐',
          appearance: '青衣乌发,眉间朱砂',
          relationships: { 林凡: '青梅竹马' }
        }
      ],
      worldSettings: [
        {
          keyword: '修炼体系',
          category: '体系',
          description: '炼气 → 筑基 → 金丹 → 元婴 → 化神 → 渡劫,每境九重'
        },
        {
          keyword: '上古传承',
          category: '秘宝',
          description: '远古强者的功法记忆,融入识海即可继承,但需承受神识冲击'
        },
        {
          keyword: '青云镇',
          category: '地理',
          description: '大陆边缘的小镇,灵气稀薄,却是上古战场的遗址'
        }
      ],
      outline: {
        title: '逆天传承·初版大纲',
        theme: '少年崛起,逆天改命',
        chapters: 50,
        active: true,
        content:
          '第一卷:青云镇觉醒\n  第1-10章:识海传承,初入修炼\n  第11-20章:小镇风波,初露锋芒\n第二卷:宗门风云\n  第21-40章:拜入宗门,秘境试炼\n  第41-50章:直面宿敌,逆天一战'
      }
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
      sharedForReference: false,
      characters: [
        {
          name: '陆远',
          age: 24,
          gender: '男',
          personality: '踏实认真,略显木讷',
          background: '二线城市普通家庭,刚入职互联网公司',
          weapon: '——',
          identity: '产品实习生',
          appearance: '戴黑框眼镜,身材清瘦',
          relationships: { 苏静: '职场导师' }
        },
        {
          name: '苏静',
          age: 30,
          gender: '女',
          personality: '干练犀利,外冷内热',
          background: '资深产品经理,带教新人',
          weapon: '——',
          identity: '产品总监',
          appearance: '利落短发,西装干练',
          relationships: { 陆远: '带教新人' }
        }
      ],
      worldSettings: [
        {
          keyword: '公司架构',
          category: '组织',
          description: '扁平化互联网团队,产品/研发/运营三角协作'
        },
        {
          keyword: '行业潜规则',
          category: '规则',
          description: '汇报链路、背锅文化、向上管理与向下兼容'
        },
        {
          keyword: '项目节奏',
          category: '节奏',
          description: '双周迭代、需求评审、上线灰度与复盘'
        }
      ],
      outline: {
        title: '职场破茧·初版大纲',
        theme: '从懵懂新人到独当一面',
        chapters: 40,
        active: true,
        content:
          '第一卷:初入职场\n  第1-8章:入职迷茫,第一次需求评审\n第二卷:挫折与成长\n  第9-24章:背锅、救火、第一次独立负责模块\n第三卷:破茧\n  第25-40章:主导项目,找到自我价值'
      }
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
      sharedForReference: false,
      characters: [
        {
          name: '江辰',
          age: 26,
          gender: '男',
          personality: '冷静果决,重情重义',
          background: '末日前的工程师,末世幸存者领袖',
          weapon: '改装脉冲步枪',
          identity: '避难所队长',
          appearance: '左脸一道旧疤,眼神坚毅',
          relationships: { 沐雪: '搭档' }
        },
        {
          name: '沐雪',
          age: 23,
          gender: '女',
          personality: '理性敏锐,外冷内热',
          background: '末世前遗传学家,研究变异真相',
          weapon: '医用手术刀',
          identity: '首席研究员',
          appearance: '白大褂染尘,神色疲惫',
          relationships: { 江辰: '搭档' }
        }
      ],
      worldSettings: [
        {
          keyword: '废土生态',
          category: '环境',
          description: '辐射尘暴、变异兽群、稀缺的洁净水源'
        },
        {
          keyword: '能源危机',
          category: '资源',
          description: '旧时代电网瘫痪,核聚变核心成为各方争夺焦点'
        },
        {
          keyword: '变异生物',
          category: '威胁',
          description: '受辐射影响的巨型节肢与兽化人类'
        }
      ],
      outline: {
        title: '废土火种·初版大纲',
        theme: '在废墟中重建文明的希望',
        chapters: 45,
        active: true,
        content:
          '第一卷:余烬\n  第1-10章:避难所危机,首次外出觅食\n第二卷:迁徙\n  第11-30章:穿越废土,遭遇变异兽群\n第三卷:火种\n  第31-45章:找到聚变核心,点燃新文明'
      }
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
      sharedForReference: false,
      characters: [
        {
          name: '沈默',
          age: 35,
          gender: '男',
          personality: '缜密寡言,洞若观火',
          background: '退役刑警,现独立侦探',
          weapon: '——',
          identity: '侦探',
          appearance: '常穿风衣,指间转着一枚旧硬币',
          relationships: { 林晚: '助手' }
        },
        {
          name: '林晚',
          age: 25,
          gender: '女',
          personality: '机敏好奇,敢于冒险',
          background: '警校高材生,沈默的见习助手',
          weapon: '——',
          identity: '助手',
          appearance: '马尾利落,眼神明亮',
          relationships: { 沈默: '导师' }
        }
      ],
      worldSettings: [
        {
          keyword: '案件档案',
          category: '线索',
          description: '案发现场、死者关系网、时间线还原'
        },
        {
          keyword: '作案手法',
          category: '手法',
          description: '密室、延时装置、心理暗示等诡计类型'
        },
        {
          keyword: '线索网',
          category: '推理',
          description: '动机—机会—证据三者的交叉印证'
        }
      ],
      outline: {
        title: '无声证词·初版大纲',
        theme: '真相藏在细节里',
        chapters: 36,
        active: true,
        content:
          '第一卷:命案\n  第1-9章:雨夜凶案,第一现场还原\n第二卷:迷雾\n  第10-24章:嫌疑人逐一登场,伪证浮现\n第三卷:真相\n  第25-36章:反转收网,沉默者的证词'
      }
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
      sharedForReference: false,
      characters: [
        {
          name: '李策',
          age: 28,
          gender: '男',
          personality: '沉稳多谋,胸怀大志',
          background: '现代历史学者,魂穿乱世皇子',
          weapon: '鎏金长剑',
          identity: '穿越皇子',
          appearance: '眉目疏朗,气度沉稳',
          relationships: { 赵珩: '旧臣' }
        },
        {
          name: '赵珩',
          age: 52,
          gender: '男',
          personality: '老成持重,忠心耿耿',
          background: '三朝元老,辅政重臣',
          weapon: '——',
          identity: '丞相',
          appearance: '须发半白,目光如炬',
          relationships: { 李策: '君主' }
        }
      ],
      worldSettings: [
        {
          keyword: '朝堂势力',
          category: '势力',
          description: '皇子党、寒门派、世家门阀三足鼎立'
        },
        {
          keyword: '军政制度',
          category: '制度',
          description: '府兵制、科举取士、盐铁专营'
        },
        {
          keyword: '民生百态',
          category: '社会',
          description: '均田、租庸调、市集与漕运'
        }
      ],
      outline: {
        title: '穿越霸业·初版大纲',
        theme: '以史为鉴,乱世称雄',
        chapters: 48,
        active: true,
        content:
          '第一卷:蛰伏\n  第1-12章:借尸还魂,暗中积蓄力量\n第二卷:争锋\n  第13-32章:朝堂博弈,削藩集权\n第三卷:一统\n  第33-48章:北征南抚,奠定霸业'
      }
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
      sharedForReference: false,
      characters: [
        {
          name: '顾言',
          age: 29,
          gender: '男',
          personality: '温柔克制,内敛深情',
          background: '急诊科医生,曾经历失去',
          weapon: '——',
          identity: '主治医师',
          appearance: '白大褂整洁,笑意温和',
          relationships: { 沈念: '恋人' }
        },
        {
          name: '沈念',
          age: 26,
          gender: '女',
          personality: '敏感细腻,外冷内热',
          background: '自由插画师,因创伤封闭自我',
          weapon: '——',
          identity: '插画师',
          appearance: '长发及肩,腕间一串旧手绳',
          relationships: { 顾言: '恋人' }
        }
      ],
      worldSettings: [
        {
          keyword: '小镇日常',
          category: '生活',
          description: '临海小镇的咖啡馆、书店与黄昏海岸线'
        },
        {
          keyword: '治愈日常',
          category: '情感',
          description: '做饭、散步、雨天听歌的细碎温柔'
        },
        {
          keyword: '情感羁绊',
          category: '关系',
          description: '从试探到信任,彼此填补缺失的拼图'
        }
      ],
      outline: {
        title: '久依·初版大纲',
        theme: '慢慢来,比较快',
        chapters: 30,
        active: true,
        content:
          '第一卷:相遇\n  第1-8章:雨夜急诊,初遇与误会\n第二卷:靠近\n  第9-20章:日常相处,心防渐松\n第三卷:相依\n  第21-30章:坦白过往,笃定相守'
      }
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
