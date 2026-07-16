import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { searchCharactersByName, listCharacterAppears } from '../../api/index.js';
import { useI18n } from '../../context/I18nContext.jsx';

/**
 * 写作侧边栏 - 人物面板(UX-06)。
 * <p>支持按名搜索,点击插入到正文,展开查看出现章节。</p>
 *
 * @param {Object} props
 * @param {(text: string) => void} props.onInsert  插入人物名到正文的回调
 */
export default function CharacterPanel({ onInsert }) {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [appears, setAppears] = useState([]);
  const [appearsLoading, setAppearsLoading] = useState(false);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchCharactersByName(keyword.trim() || undefined);
        setList(r || []);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleInsert = (name) => {
    if (!name || !onInsert) return;
    onInsert(name);
    toast.success(t('chapter.sidePane.character.inserted'));
  };

  const handleExpand = async (character) => {
    if (expandedId === character.id) {
      setExpandedId(null);
      setAppears([]);
      return;
    }
    setExpandedId(character.id);
    setAppearsLoading(true);
    try {
      const r = await listCharacterAppears(character.id);
      setAppears(r || []);
    } catch {
      toast.error(t('chapter.sidePane.character.appearLoadFailed'));
      setAppears([]);
    } finally {
      setAppearsLoading(false);
    }
  };

  const isEmpty = useMemo(() => !loading && list.length === 0, [loading, list.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-cyan-400/10 px-3 py-2">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-widest text-cyan-300/60">
          <Users className="h-3.5 w-3.5" />
          {t('chapter.sidePane.tab.character')}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('chapter.sidePane.character.searchPlaceholder')}
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
            {t('chapter.sidePane.character.empty')}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {list.map((c) => (
              <li
                key={c.id}
                className="rounded border border-cyan-400/10 bg-black/30 transition hover:border-cyan-300/40"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <button
                    onClick={() => handleInsert(c.name)}
                    className="flex-1 truncate text-left text-[12px] font-medium text-cyan-200 hover:text-cyan-100 hover:underline"
                    title={c.name}
                  >
                    {c.name}
                  </button>
                  <button
                    onClick={() => handleExpand(c)}
                    className="rounded p-1 text-white/40 transition hover:bg-white/5 hover:text-cyan-300"
                    title={t('chapter.sidePane.character.appearTitle')}
                  >
                    <BookOpen className="h-3 w-3" />
                  </button>
                </div>
                {c.identity && (
                  <div className="px-2 pb-1 text-[10px] leading-relaxed text-white/40">
                    {c.identity}
                  </div>
                )}
                {expandedId === c.id && (
                  <div className="border-t border-cyan-400/10 px-2 py-1.5">
                    {appearsLoading ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-cyan-300/60">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('common.loading')}
                      </div>
                    ) : appears.length === 0 ? (
                      <div className="text-[10px] tracking-wide text-white/30">
                        {t('chapter.sidePane.character.appearEmpty')}
                      </div>
                    ) : (
                      <ul className="space-y-0.5">
                        {appears.map((ch) => (
                          <li
                            key={ch.id}
                            className="truncate text-[10px] text-white/60"
                            title={`第 ${ch.chapterNo} 章 · ${ch.title || ''}`}
                          >
                            <span className="font-mono text-cyan-300/70">
                              #{String(ch.chapterNo).padStart(2, '0')}
                            </span>{' '}
                            {ch.title || '(无标题)'}
                          </li>
                        ))}
                      </ul>
                    )}
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
