import { useParams, useLocation } from 'react-router-dom';
import Breadcrumb from './Breadcrumb.jsx';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 小说工作台子页的面包屑条带。
 *
 * <p>路由约定(见 App.jsx):</p>
 * <pre>
 *   /novels/:novelId/overview     → 我的小说 / {novelTitle} / 总览
 *   /novels/:novelId/writing      → 我的小说 / {novelTitle} / 多轮写作
 *   /novels/:novelId/outline      → 我的小说 / {novelTitle} / 大纲
 *   /novels/:novelId/chapter      → 我的小说 / {novelTitle} / 章节
 *   /novels/:novelId/character    → 我的小说 / {novelTitle} / 人物
 *   /novels/:novelId/lore         → 我的小说 / {novelTitle} / 世界观
 * </pre>
 *
 * <p>novelTitle 由 NovelContext 之外的轻量来源提供:进入 overview 时已通过
 * getNovelOverview 拉到完整对象并存入 sessionStorage 缓存(由 NovelOverview 写入),
 * 此处读取作为面包屑的中间段;读不到时退化为 #id。</p>
 *
 * <p>该组件在 NovelLayout 之外不可用(路径不匹配时返回 null)。</p>
 *
 * @author songshan.li (ID: 17099618)
 */
const SEG_LABEL_KEY = {
  overview: 'novel.breadcrumb.overview',
  writing: 'novel.breadcrumb.writing',
  outline: 'novel.breadcrumb.outline',
  chapter: 'novel.breadcrumb.chapter',
  character: 'novel.breadcrumb.character',
  lore: 'novel.breadcrumb.lore'
};

const NOVEL_TITLE_CACHE = 'ink_realm_novel_title_cache';

const readCachedTitle = (novelId) => {
  if (!novelId) return '';
  try {
    const raw = sessionStorage.getItem(NOVEL_TITLE_CACHE);
    if (!raw) return '';
    const map = JSON.parse(raw);
    return map && typeof map === 'object' ? map[String(novelId)] || '' : '';
  } catch {
    return '';
  }
};

export const writeCachedNovelTitle = (novelId, title) => {
  if (!novelId || !title) return;
  try {
    const raw = sessionStorage.getItem(NOVEL_TITLE_CACHE);
    const map = raw ? JSON.parse(raw) : {};
    if (!map || typeof map !== 'object') return;
    map[String(novelId)] = title;
    sessionStorage.setItem(NOVEL_TITLE_CACHE, JSON.stringify(map));
  } catch {
    /* 静默降级 */
  }
};

export default function NovelBreadcrumbBar() {
  const { t } = useI18n();
  const { novelId } = useParams();
  const location = useLocation();
  const seg = location.pathname.split('/').filter(Boolean).pop();

  if (!novelId || !seg || !SEG_LABEL_KEY[seg]) return null;

  const title = readCachedTitle(novelId) || `#${novelId}`;
  const items = [
    { label: title, to: `/novels/${novelId}/overview` },
    { label: t(SEG_LABEL_KEY[seg]) }
  ];

  return (
    <div className="border-b border-cyan-400/10 bg-black/30 px-4 py-2 backdrop-blur-sm sm:px-8">
      <Breadcrumb items={items} />
    </div>
  );
}
