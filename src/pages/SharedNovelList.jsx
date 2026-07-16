import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Loader2, BookOpen, ArrowLeft, Search, X, Compass } from 'lucide-react';
import { toast } from 'sonner';
import { listSharedNovels } from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 公共参考池列表页(BASE-09)。
 *
 * <p>展示所有用户公开的脱敏小说列表,点击卡片进入只读详情页(/novels/shared/:novelId)。</p>
 *
 * <p>仅 owner 自身的小说可在本页可见且可进入工作台;公共参考池面向"学习借鉴",
 * 不暴露 ownerId,不允许任何写操作。</p>
 */
export default function SharedNovelList() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]);
  const [keyword, setKeyword] = useState('');
  const fetchedRef = useRef(false);

  const fetchNovels = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSharedNovels();
      setNovels(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(t('novel.shared.fetch.failed') + ':' + (err.message || ''));
      setNovels([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchNovels();
  }, [fetchNovels]);

  const filtered = (() => {
    if (!keyword.trim()) return novels;
    const k = keyword.trim().toLowerCase();
    return novels.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(k) ||
        (n.author || '').toLowerCase().includes(k) ||
        (n.description || '').toLowerCase().includes(k)
    );
  })();

  const handleOpen = (id) => {
    navigate(`/novels/shared/${id}`);
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* 头部 */}
      <header className="border-b border-cyan-400/10 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/novels')}
              className="mt-1 rounded border border-cyan-400/30 px-2 py-1 text-cyan-300/70 transition hover:bg-cyan-400/10"
              title={t('nav.backToNovels')}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] tracking-widest text-cyan-300/40">
                <Compass className="h-3 w-3" />
                {t('novel.shared.badge')}
              </div>
              <div className="sf-heading">{t('novel.shared.list.title')}</div>
              <p className="mt-2 pl-4 text-[12px] tracking-wide text-cyan-300/50">
                {t('novel.shared.list.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* 搜索 */}
        <div className="mt-5 flex items-center gap-2">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('novel.shared.list.searchPlaceholder')}
              className="w-full rounded border border-cyan-400/20 bg-black/40 py-2 pl-9 pr-9 text-[12px] text-white/80 placeholder-white/30 outline-none focus:border-cyan-300/60"
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/30 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <span className="text-[10px] tracking-widest text-white/30">
            {filtered.length}/{novels.length}
          </span>
        </div>
      </header>

      {/* 列表区 */}
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-8 sm:py-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-cyan-300/60">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('common.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-white/40">
            <Globe className="h-10 w-10 opacity-40" />
            <div className="text-sm tracking-wide">
              {keyword ? t('novel.shared.list.emptyKeyword') : t('novel.shared.list.empty')}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((novel) => (
              <div
                key={novel.id}
                onClick={() => handleOpen(novel.id)}
                className="sf-scan group relative cursor-pointer rounded border border-cyan-400/15 bg-black/40 p-5 transition hover:border-cyan-300/50 hover:bg-cyan-400/[0.04]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] tracking-widest text-cyan-300/40">
                    <BookOpen className="h-3 w-3" />
                    SHARED
                  </div>
                  <span className="flex items-center gap-1 rounded bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-300">
                    <Globe className="h-3 w-3" />
                    {t('novel.list.card.shared')}
                  </span>
                </div>

                <div
                  className="mb-1 text-lg font-bold leading-tight text-white"
                  style={{
                    fontFamily:
                      '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
                  }}
                >
                  {novel.title || '(未命名)'}
                </div>
                <div className="mb-3 text-[11px] tracking-wider text-cyan-300/40">
                  {novel.author || '—'}
                </div>

                <div className="mb-4 line-clamp-3 min-h-[3.6em] text-[12px] leading-relaxed text-white/60">
                  {novel.description || '—'}
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 text-[11px] tracking-widest text-cyan-300/60 opacity-0 transition group-hover:opacity-100">
                  {t('novel.shared.list.open')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
