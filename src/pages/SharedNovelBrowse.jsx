import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ListTree,
  UserCircle2,
  Globe,
  Loader2,
  Compass,
  Search,
  X,
  ChevronRight,
  FileText,
  Users,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { getSharedNovelBrowse } from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 公共参考池浏览页(BASE-09)。
 *
 * <p>只读视图,展示他人公开的脱敏小说内容:</p>
 * <ul>
 *   <li>顶部:返回按钮 + 小说标题/作者/简介 + 各模块统计</li>
 *   <li>Tab 切换:章节 / 大纲 / 人物 / 世界观</li>
 *   <li>章节 tab:列出章节摘要,点击在右侧抽屉查看完整正文(只读)</li>
 *   <li>大纲 tab:版本列表 + 选中版本的全文预览</li>
 *   <li>人物 tab:网格卡片,含关系图(只读)</li>
 *   <li>世界观 tab:关键词索引列表</li>
 * </ul>
 *
 * <p>页面以"参考学习"为目的,不允许任何写操作。</p>
 */
export default function SharedNovelBrowse() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { novelId } = useParams();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('chapters');
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [selectedOutlineId, setSelectedOutlineId] = useState(null);
  const [keyword, setKeyword] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSharedNovelBrowse(novelId);
      setDetail(data || null);
      if (data?.chapters?.length) {
        setSelectedChapterId(data.chapters[0].id);
      }
      if (data?.outlines?.length) {
        setSelectedOutlineId(data.outlines[0].id);
      }
    } catch (err) {
      toast.error(t('novel.shared.fetch.failed') + ':' + (err?.message || ''));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [t, novelId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const filteredChapters = useMemo(() => {
    if (!detail?.chapters) return [];
    if (!keyword.trim()) return detail.chapters;
    const k = keyword.trim().toLowerCase();
    return detail.chapters.filter(
      (c) =>
        (c.title || '').toLowerCase().includes(k) ||
        (c.contentPreview || '').toLowerCase().includes(k)
    );
  }, [detail, keyword]);

  const filteredCharacters = useMemo(() => {
    if (!detail?.characters) return [];
    if (!keyword.trim()) return detail.characters;
    const k = keyword.trim().toLowerCase();
    return detail.characters.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(k) ||
        (c.personality || '').toLowerCase().includes(k) ||
        (c.background || '').toLowerCase().includes(k)
    );
  }, [detail, keyword]);

  const filteredSettings = useMemo(() => {
    if (!detail?.settings) return [];
    if (!keyword.trim()) return detail.settings;
    const k = keyword.trim().toLowerCase();
    return detail.settings.filter(
      (s) =>
        (s.keyword || '').toLowerCase().includes(k) ||
        (s.category || '').toLowerCase().includes(k) ||
        (s.description || '').toLowerCase().includes(k)
    );
  }, [detail, keyword]);

  const selectedChapter = useMemo(
    () => detail?.chapters?.find((c) => c.id === selectedChapterId) || null,
    [detail, selectedChapterId]
  );
  const selectedOutline = useMemo(
    () => detail?.outlines?.find((o) => o.id === selectedOutlineId) || null,
    [detail, selectedOutlineId]
  );

  const formatTime = (ts) => {
    if (!ts) return '-';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-cyan-300/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-white/40">
        <BookOpen className="h-12 w-12 opacity-40" />
        <div className="text-sm tracking-wide">{t('novel.shared.fetch.failed')}</div>
        <button
          onClick={() => navigate('/novels/shared')}
          className="rounded border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
        >
          {t('novel.shared.backToList')}
        </button>
      </div>
    );
  }

  const tabs = [
    { key: 'chapters', label: t('novel.shared.tab.chapters'), icon: BookOpen, count: detail.chapterCount },
    { key: 'outlines', label: t('novel.shared.tab.outlines'), icon: ListTree, count: detail.outlineCount },
    { key: 'characters', label: t('novel.shared.tab.characters'), icon: UserCircle2, count: detail.characterCount },
    { key: 'settings', label: t('novel.shared.tab.settings'), icon: Globe, count: detail.settingCount }
  ];

  const stats = [
    { label: t('novel.shared.stat.chapters'), value: detail.chapterCount, icon: BookOpen },
    { label: t('novel.shared.stat.outlines'), value: detail.outlineCount, icon: ListTree },
    { label: t('novel.shared.stat.characters'), value: detail.characterCount, icon: UserCircle2 },
    { label: t('novel.shared.stat.settings'), value: detail.settingCount, icon: Globe }
  ];

  return (
    <div className="flex min-h-full flex-col">
      {/* 头部 */}
      <header className="border-b border-cyan-400/10 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/novels/shared')}
            className="mt-1 rounded border border-cyan-400/30 px-2 py-1 text-cyan-300/70 transition hover:bg-cyan-400/10"
            title={t('novel.shared.backToList')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[10px] tracking-widest text-cyan-300/40">
              <Sparkles className="h-3 w-3" />
              {t('novel.shared.badge')}
            </div>
            <div
              className="mt-2 text-2xl font-bold leading-tight text-white"
              style={{
                fontFamily:
                  '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
              }}
            >
              {detail.title || '(未命名)'}
            </div>
            <div className="mt-1 text-[11px] tracking-wider text-cyan-300/40">
              {detail.author || '—'}
            </div>
            {detail.description && (
              <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-white/60">
                {detail.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] tracking-wider text-white/30">
              <span>{t('novel.list.card.createdAt')}: {formatTime(detail.createdAt)}</span>
              <span>{t('novel.list.card.updatedAt')}: {formatTime(detail.updatedAt)}</span>
              <span className="flex items-center gap-1 rounded bg-cyan-400/10 px-2 py-0.5 text-cyan-300">
                <Globe className="h-3 w-3" />
                {t('novel.list.card.shared')}
              </span>
            </div>
          </div>
        </div>

        {/* 统计 */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded border border-cyan-400/15 bg-black/40 p-3"
              >
                <div className="mb-1 flex items-center gap-1 text-[10px] tracking-widest text-cyan-300/40">
                  <Icon className="h-3 w-3" />
                  {s.label}
                </div>
                <div className="font-mono text-lg text-white">{s.value}</div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Tab + 内容 */}
      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {/* Tab 栏 */}
        <div className="mb-4 flex items-center gap-1 border-b border-cyan-400/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 text-[12px] tracking-wide transition ${
                  isActive
                    ? 'border-b-2 border-cyan-300 text-cyan-300'
                    : 'border-b-2 border-transparent text-white/50 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/40">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 搜索框(章节/人物/设定 tab 可用) */}
        {activeTab !== 'outlines' && (
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t(`novel.shared.search.${activeTab}`)}
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
          </div>
        )}

        {/* 章节列表 */}
        {activeTab === 'chapters' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ul className="space-y-1.5 lg:col-span-1">
              {filteredChapters.length === 0 ? (
                <li className="py-12 text-center text-[12px] text-white/30">
                  {t('novel.shared.empty.chapters')}
                </li>
              ) : (
                filteredChapters.map((ch) => (
                  <li
                    key={ch.id}
                    onClick={() => setSelectedChapterId(ch.id)}
                    className={`cursor-pointer rounded border px-3 py-2 transition ${
                      selectedChapterId === ch.id
                        ? 'border-cyan-300/60 bg-cyan-400/[0.06]'
                        : 'border-white/5 bg-black/30 hover:border-cyan-300/30 hover:bg-cyan-400/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-cyan-300/50">
                        #{ch.chapterNo ?? '-'}
                      </span>
                      <span className="flex-1 truncate text-[12px] text-white/85">
                        {ch.title || '(未命名)'}
                      </span>
                      <ChevronRight className="h-3 w-3 text-white/30" />
                    </div>
                    {ch.contentPreview && (
                      <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">
                        {ch.contentPreview}
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
            <div className="lg:col-span-2">
              {selectedChapter ? (
                <article className="rounded border border-cyan-400/15 bg-black/40 p-5">
                  <div className="mb-3 border-b border-cyan-400/10 pb-3">
                    <div className="text-[10px] tracking-widest text-cyan-300/40">
                      {t('novel.shared.readonlyHint')}
                    </div>
                    <div
                      className="mt-1 text-xl font-bold text-white"
                      style={{
                        fontFamily:
                          '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
                      }}
                    >
                      第 {selectedChapter.chapterNo} 章 · {selectedChapter.title}
                    </div>
                    <div className="mt-1 text-[10px] tracking-wider text-white/30">
                      {t('novel.shared.wordCount').replace(
                        '{{count}}',
                        String(selectedChapter.wordCount ?? 0)
                      )}
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-loose text-white/80">
                    {selectedChapter.contentPreview || t('novel.shared.empty.chapterContent')}
                  </pre>
                </article>
              ) : (
                <div className="flex h-64 items-center justify-center text-[12px] text-white/30">
                  {t('novel.shared.empty.chapterContent')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 大纲列表 */}
        {activeTab === 'outlines' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ul className="space-y-1.5 lg:col-span-1">
              {detail.outlines?.length === 0 ? (
                <li className="py-12 text-center text-[12px] text-white/30">
                  {t('novel.shared.empty.outlines')}
                </li>
              ) : (
                detail.outlines?.map((o) => (
                  <li
                    key={o.id}
                    onClick={() => setSelectedOutlineId(o.id)}
                    className={`cursor-pointer rounded border px-3 py-2 transition ${
                      selectedOutlineId === o.id
                        ? 'border-cyan-300/60 bg-cyan-400/[0.06]'
                        : 'border-white/5 bg-black/30 hover:border-cyan-300/30 hover:bg-cyan-400/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {o.active ? (
                        <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 text-[9px] tracking-widest text-cyan-300">
                          {t('novel.overview.stat.activeOutline.yes')}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-white/30">
                          v{o.version ?? '-'}
                        </span>
                      )}
                      <span className="flex-1 truncate text-[12px] text-white/85">
                        {o.title || `#${o.id}`}
                      </span>
                      <ChevronRight className="h-3 w-3 text-white/30" />
                    </div>
                    {o.theme && (
                      <div className="mt-1 text-[11px] text-white/40">{o.theme}</div>
                    )}
                  </li>
                ))
              )}
            </ul>
            <div className="lg:col-span-2">
              {selectedOutline ? (
                <article className="rounded border border-cyan-400/15 bg-black/40 p-5">
                  <div className="mb-3 border-b border-cyan-400/10 pb-3">
                    <div className="text-[10px] tracking-widest text-cyan-300/40">
                      {t('novel.shared.readonlyHint')}
                    </div>
                    <div
                      className="mt-1 text-xl font-bold text-white"
                      style={{
                        fontFamily:
                          '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
                      }}
                    >
                      {selectedOutline.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] tracking-wider text-white/40">
                      <span>v{selectedOutline.version}</span>
                      {selectedOutline.theme && <span>· {selectedOutline.theme}</span>}
                      <span>· {t('novel.shared.outlineLength').replace(
                        '{{count}}',
                        String(selectedOutline.contentLength ?? 0)
                      )}</span>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-loose text-white/80">
                    {selectedOutline.contentPreview || t('novel.shared.empty.outlineContent')}
                  </pre>
                </article>
              ) : (
                <div className="flex h-64 items-center justify-center text-[12px] text-white/30">
                  {t('novel.shared.empty.outlineContent')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 人物列表 */}
        {activeTab === 'characters' && (
          <div>
            {filteredCharacters.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-white/30">
                {t('novel.shared.empty.characters')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCharacters.map((c) => (
                  <div
                    key={c.id}
                    className="rounded border border-cyan-400/15 bg-black/40 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-300/60" />
                      <div
                        className="text-base font-bold text-white"
                        style={{
                          fontFamily:
                            '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
                        }}
                      >
                        {c.name || '(未命名)'}
                      </div>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] text-white/50">
                      {c.age != null && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5">
                          {c.age} {t('novel.shared.character.ageUnit')}
                        </span>
                      )}
                      {c.gender && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5">{c.gender}</span>
                      )}
                      {c.identity && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5">{c.identity}</span>
                      )}
                    </div>
                    {c.personality && (
                      <div className="mb-2 text-[11px] leading-relaxed text-white/60">
                        <span className="text-cyan-300/60">{t('novel.shared.character.personality')}: </span>
                        {c.personality}
                      </div>
                    )}
                    {c.background && (
                      <div className="mb-2 text-[11px] leading-relaxed text-white/60">
                        <span className="text-cyan-300/60">{t('novel.shared.character.background')}: </span>
                        {c.background}
                      </div>
                    )}
                    {c.weapon && (
                      <div className="text-[11px] leading-relaxed text-white/60">
                        <span className="text-cyan-300/60">{t('novel.shared.character.weapon')}: </span>
                        {c.weapon}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 世界观设定 */}
        {activeTab === 'settings' && (
          <div>
            {filteredSettings.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-white/30">
                {t('novel.shared.empty.settings')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredSettings.map((s) => (
                  <div
                    key={s.id}
                    className="rounded border border-cyan-400/15 bg-black/40 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-amber-300/60" />
                      <div
                        className="text-base font-bold text-white"
                        style={{
                          fontFamily:
                            '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
                        }}
                      >
                        {s.keyword || '(未命名)'}
                      </div>
                      {s.category && (
                        <span className="ml-auto rounded bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
                          {s.category}
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-[12px] leading-relaxed text-white/60">
                        {s.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
