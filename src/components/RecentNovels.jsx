import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, ChevronRight } from 'lucide-react';
import { STORAGE_KEYS } from '../constants/storage.js';
import { loadLocal, saveLocal } from '../utils/storage.js';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 最近访问的小说横滑卡(UX-10)。
 *
 * <p>从 localStorage 的 RECENT_NOVELS 数组读取,展示最近 3 本。点击卡片直接跳转到
 * 对应小说的 overview。空数组时不渲染(避免占位)。</p>
 *
 * <p>数组结构: [{ id, title, author, visitedAt }]</p>
 *
 * @author songshan.li (ID: 17099618)
 */
const MAX_ITEMS = 3;

function formatRelative(ts, locale) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return locale === 'en' ? 'just now' : '刚刚';
  if (diff < hour) {
    const n = Math.floor(diff / minute);
    return locale === 'en' ? `${n}m ago` : `${n} 分钟前`;
  }
  if (diff < day) {
    const n = Math.floor(diff / hour);
    return locale === 'en' ? `${n}h ago` : `${n} 小时前`;
  }
  const n = Math.floor(diff / day);
  return locale === 'en' ? `${n}d ago` : `${n} 天前`;
}

/**
 * 把一本小说推到最近访问列表头部(去重 + 截断到 MAX_ITEMS 的 2 倍以保留历史)。
 * 供业务页(进入 overview/writing/outline 等时)调用。
 */
export const pushRecentNovel = (novel) => {
  if (!novel || !novel.id) return;
  const list = loadLocal(STORAGE_KEYS.RECENT_NOVELS) || [];
  const filtered = list.filter((n) => n.id !== novel.id);
  const next = [
    {
      id: novel.id,
      title: novel.title || '',
      author: novel.author || '',
      visitedAt: Date.now()
    },
    ...filtered
  ].slice(0, MAX_ITEMS * 4);
  saveLocal(STORAGE_KEYS.RECENT_NOVELS, next);
};

export default function RecentNovels() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  const refresh = useCallback(() => {
    const list = loadLocal(STORAGE_KEYS.RECENT_NOVELS) || [];
    setItems(list.slice(0, MAX_ITEMS));
  }, []);

  useEffect(() => {
    refresh();
    // 跨标签页同步
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.RECENT_NOVELS) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  if (items.length === 0) return null;

  const handleOpen = (id) => {
    navigate(`/novels/${id}/overview`);
  };

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] tracking-widest text-cyan-300/60">
        <Clock className="h-3.5 w-3.5" />
        {t('recent.title')}
      </div>
      <div className="sf-scroll-x flex gap-3 overflow-x-auto pb-1">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => handleOpen(n.id)}
            className="group flex min-w-[200px] max-w-[260px] flex-1 items-center gap-3 rounded border border-cyan-400/15 bg-black/40 p-3 text-left transition hover:border-cyan-300/50 hover:bg-cyan-400/[0.04]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-cyan-400/20 bg-cyan-400/[0.04]">
              <BookOpen className="h-4 w-4 text-cyan-300/70" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-white/90">
                {n.title || '(未命名)'}
              </div>
              <div className="mt-0.5 truncate text-[10px] tracking-wide text-cyan-300/40">
                {n.author || '—'}
              </div>
              <div className="mt-0.5 text-[10px] text-white/30">
                {formatRelative(n.visitedAt, lang)}
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cyan-300/40 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
          </button>
        ))}
      </div>
    </section>
  );
}
