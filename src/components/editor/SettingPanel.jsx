import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Globe, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { searchSettings } from '../../api/index.js';
import { useI18n } from '../../context/I18nContext.jsx';

/**
 * 写作侧边栏 - 世界观设定面板(UX-06)。
 * <p>按关键词 RAG 检索设定,点击卡片一键复制到剪贴板。</p>
 */
export default function SettingPanel() {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchSettings(keyword.trim() || undefined);
        setList(r || []);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleCopy = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('chapter.sidePane.setting.copied'));
    } catch {
      toast.error(t('chapter.sidePane.setting.copyFailed'));
    }
  };

  const isEmpty = useMemo(() => !loading && list.length === 0, [loading, list.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-cyan-400/10 px-3 py-2">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-widest text-cyan-300/60">
          <Globe className="h-3.5 w-3.5" />
          {t('chapter.sidePane.tab.setting')}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('chapter.sidePane.setting.searchPlaceholder')}
            className="w-full rounded border border-cyan-400/15 bg-black/40 py-1.5 pl-7 pr-2 text-[12px] text-white/85 placeholder:text-white/30 focus:border-cyan-300/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-cyan-300/60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : isEmpty ? (
          <div className="py-8 text-center text-[11px] tracking-wide text-white/30">
            {t('chapter.sidePane.setting.empty')}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {list.map((s) => (
              <li
                key={s.id}
                className="group rounded border border-cyan-400/10 bg-black/30 p-2 transition hover:border-cyan-300/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {s.category && (
                      <span className="rounded border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 text-[9px] tracking-widest text-cyan-300/80">
                        {s.category}
                      </span>
                    )}
                    <span className="text-[12px] font-medium text-cyan-200">{s.keyword}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(s.description)}
                    className="rounded p-1 text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-white/5 hover:text-cyan-300"
                    title={t('common.copy')}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {s.description && (
                  <div className="mt-1 line-clamp-4 whitespace-pre-wrap text-[11px] leading-relaxed text-white/55">
                    {s.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
