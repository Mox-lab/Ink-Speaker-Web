import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ListTree,
  UserCircle2,
  Globe,
  AlertTriangle,
  Edit3,
  Trash2,
  PenLine,
  Loader2,
  Compass,
  Zap,
  CheckCircle2,
  Download,
  ChevronDown,
  FileText,
  FileType2,
  Braces,
  Sparkles,
  Target,
  Swords,
  Users,
  Flag,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteNovel,
  exportNovel,
  getContinuationSuggestion,
  getNovelOverview
} from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useNovelContext } from '../context/NovelContext.jsx';
import { writeCachedNovelTitle } from '../components/NovelBreadcrumbBar.jsx';
import NovelTimeline from '../components/NovelTimeline.jsx';

/**
 * 小说总览页(进入小说后第一屏)。
 *
 * <p>第 6 阶段(以小说为主体):</p>
 * <ul>
 *   <li>调 getNovelOverview(novelId) 一次性拉取基础信息 + 各子模块统计 + 最近章节/大纲列表</li>
 *   <li>顶部展示小说标题/作者/简介 + 主操作按钮(继续写作 / 编辑信息 / 删除)</li>
 *   <li>中部展示 6 个统计卡片(章节/最新章节号/大纲版本/激活大纲/人物/设定/待审查问题)</li>
 *   <li>底部展示最近章节列表(最多 5 条)与大纲版本列表</li>
 *   <li>删除二次确认 + 调 deleteNovel,成功后跳回 /novels</li>
 * </ul>
 */
export default function NovelOverview() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { novelId: urlNovelId } = useParams();
  const { setActiveNovelId } = useNovelContext();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [overview, setOverview] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // BASE-12 AI 续写建议
  const [suggestion, setSuggestion] = useState(null);
  const [suggesting, setSuggesting] = useState(false);

  // 同步到 NovelContext(使请求拦截器注入 X-Novel-Id)
  useEffect(() => {
    const id = Number(urlNovelId);
    if (Number.isFinite(id) && id > 0) {
      setActiveNovelId(id);
    }
  }, [urlNovelId, setActiveNovelId]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNovelOverview(urlNovelId);
      setOverview(data || null);
      if (data) {
        // 缓存标题供 NovelBreadcrumbBar 中间段使用
        writeCachedNovelTitle(urlNovelId, data.title);
        // 最近点击排序由 NovelList 在进入时记录,此处无需重复推送
      }
    } catch (err) {
      toast.error(t('novel.overview.fetch.failed') + ':' + (err.message || ''));
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [t, urlNovelId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // 点击外部关闭导出下拉
  useEffect(() => {
    if (!exportOpen) return undefined;
    const onDown = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const handleExport = useCallback(
    async (format) => {
      setExportOpen(false);
      if (exporting) return;
      setExporting(true);
      toast.info(t('novel.export.started'));
      try {
        const { blob, filename } = await exportNovel(urlNovelId, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${t('novel.export.success')} · ${filename}`);
      } catch (err) {
        toast.error(t('novel.export.failed') + ':' + (err?.message || ''));
      } finally {
        setExporting(false);
      }
    },
    [t, urlNovelId, exporting]
  );

  const handleContinueWriting = () => {
    navigate(`/novels/${urlNovelId}/writing`);
  };

  const handleEditInfo = () => {
    navigate(`/novels/${urlNovelId}/edit`);
  };

  // BASE-12:生成 AI 续写建议
  const handleSuggest = useCallback(async () => {
    if (suggesting) return;
    setSuggesting(true);
    toast.info(t('novel.continuation.loading'));
    try {
      const data = await getContinuationSuggestion(urlNovelId);
      setSuggestion(data || null);
      toast.success(t('novel.continuation.title'));
    } catch (err) {
      toast.error(t('novel.continuation.failed') + ':' + (err?.message || ''));
    } finally {
      setSuggesting(false);
    }
  }, [suggesting, t, urlNovelId]);

  const handleDelete = async () => {
    if (!overview) return;
    const ok = window.confirm(
      t('novel.list.delete.confirm').replace('{{title}}', overview.title || '')
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteNovel(urlNovelId);
      toast.success(
        t('novel.list.delete.success').replace('{{title}}', overview.title || '')
      );
      navigate('/novels', { replace: true });
    } catch (err) {
      toast.error(err.message || t('common.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '-';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  // 待办看板:根据统计推导出建议项
  // 注意:useMemo 必须在任何早期 return 之前调用,否则违反 Hooks 规则
  const todos = useMemo(() => {
    if (!overview) return [];
    const items = [];
    if ((overview.outlineCount ?? 0) === 0) {
      items.push({
        key: 'noOutline',
        actionKey: 'gotoOutline',
        to: `/novels/${urlNovelId}/outline`
      });
    } else if (!overview.hasActiveOutline) {
      items.push({
        key: 'outlineInactive',
        actionKey: 'gotoOutline',
        to: `/novels/${urlNovelId}/outline`
      });
    }
    if ((overview.chapterCount ?? 0) === 0) {
      items.push({
        key: 'noChapter',
        actionKey: 'gotoChapter',
        to: `/novels/${urlNovelId}/chapter`
      });
    }
    if ((overview.characterCount ?? 0) === 0) {
      items.push({
        key: 'noCharacter',
        actionKey: 'gotoCharacter',
        to: `/novels/${urlNovelId}/character`
      });
    }
    if ((overview.unresolvedIssueCount ?? 0) > 0) {
      items.push({
        key: 'openIssues',
        actionKey: 'gotoReview',
        to: `/novels/${urlNovelId}/chapter`,
        count: overview.unresolvedIssueCount
      });
    }
    return items;
  }, [overview, urlNovelId]);

  // 快捷动作:基于当前小说状态给出最相关的 3 个动作
  const quickActions = useMemo(() => {
    if (!overview) return [];
    const actions = [];
    if ((overview.chapterCount ?? 0) === 0) {
      actions.push({
        key: 'gotoChapter',
        icon: PenLine,
        to: `/novels/${urlNovelId}/writing`
      });
    } else {
      actions.push({
        key: 'continueWriting',
        icon: PenLine,
        to: `/novels/${urlNovelId}/writing`,
        labelKey: 'novel.overview.action.continueWriting'
      });
    }
    actions.push({
      key: 'gotoOutline',
      icon: ListTree,
      to: `/novels/${urlNovelId}/outline`,
      labelKey: 'novel.overview.action.gotoOutline'
    });
    actions.push({
      key: 'gotoCharacter',
      icon: UserCircle2,
      to: `/novels/${urlNovelId}/character`,
      labelKey: 'novel.overview.action.gotoCharacter'
    });
    return actions;
  }, [overview, urlNovelId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-cyan-300/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-white/40">
        <BookOpen className="h-12 w-12 opacity-40" />
        <div className="text-sm tracking-wide">{t('novel.overview.fetch.failed')}</div>
        <button
          onClick={() => navigate('/novels')}
          className="rounded border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
        >
          {t('nav.backToNovels')}
        </button>
      </div>
    );
  }

  const stats = [
    {
      key: 'chapters',
      label: t('novel.overview.stat.chapters'),
      value: overview.chapterCount ?? 0,
      icon: BookOpen
    },
    {
      key: 'latestChapter',
      label: t('novel.overview.stat.latestChapter'),
      value: overview.latestChapterNo ? `#${overview.latestChapterNo}` : '-',
      icon: PenLine
    },
    {
      key: 'outlines',
      label: t('novel.overview.stat.outlines'),
      value: overview.outlineCount ?? 0,
      icon: ListTree
    },
    {
      key: 'activeOutline',
      label: t('novel.overview.stat.activeOutline'),
      value: overview.hasActiveOutline
        ? t('novel.overview.stat.activeOutline.yes')
        : t('novel.overview.stat.activeOutline.no'),
      icon: ListTree
    },
    {
      key: 'characters',
      label: t('novel.overview.stat.characters'),
      value: overview.characterCount ?? 0,
      icon: UserCircle2
    },
    {
      key: 'settings',
      label: t('novel.overview.stat.settings'),
      value: overview.settingCount ?? 0,
      icon: Globe
    },
    {
      key: 'issues',
      label: t('novel.overview.stat.issues'),
      value: overview.unresolvedIssueCount ?? 0,
      icon: AlertTriangle
    }
  ];

  const recentChapters = overview.recentChapters || [];
  const outlines = overview.outlines || [];
  const timeline = overview.timeline || [];

  // 格式化建议生成时间
  const formatGeneratedAt = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* 头部 */}
      <header className="border-b border-cyan-400/10 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/novels')}
            className="mt-1 rounded border border-cyan-400/30 px-2 py-1 text-cyan-300/70 transition hover:bg-cyan-400/10"
            title={t('nav.backToNovels')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[10px] tracking-widest text-cyan-300/40">
              <Compass className="h-3 w-3" />
              {t('novel.overview.title')}
            </div>
            <div
              className="mt-2 text-2xl font-bold leading-tight text-white"
              style={{
                fontFamily:
                  '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
              }}
            >
              {overview.title || '(未命名)'}
            </div>
            <div className="mt-1 text-[11px] tracking-wider text-cyan-300/40">
              {overview.author || '—'}
            </div>
            {overview.description && (
              <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-white/60">
                {overview.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] tracking-wider text-white/30">
              <span>{t('novel.list.card.createdAt')}: {formatTime(overview.createdAt)}</span>
              <span>{t('novel.list.card.updatedAt')}: {formatTime(overview.updatedAt)}</span>
              <span
                className={`flex items-center gap-1 rounded px-2 py-0.5 ${
                  overview.sharedForReference
                    ? 'bg-cyan-400/10 text-cyan-300'
                    : 'bg-white/5 text-white/40'
                }`}
              >
                {overview.sharedForReference ? (
                  <>
                    <Globe className="h-3 w-3" />
                    {t('novel.list.card.shared')}
                  </>
                ) : (
                  <>
                    <Globe className="h-3 w-3" />
                    {t('novel.list.card.private')}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 主操作按钮 */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={handleContinueWriting}
            className="flex items-center gap-2 rounded border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
          >
            <PenLine className="h-4 w-4" />
            {t('novel.overview.action.continueWriting')}
          </button>
          <button
            onClick={handleEditInfo}
            className="flex items-center gap-2 rounded border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
          >
            <Edit3 className="h-4 w-4" />
            {t('novel.overview.action.editInfo')}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded border border-red-500/30 px-4 py-2 text-sm text-red-300/80 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t('novel.overview.action.delete')}
          </button>

          {/* 导出下拉(BASE-10) */}
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting}
              title={t('novel.export.tooltip')}
              className="flex items-center gap-2 rounded border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t('novel.export.action')}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded border border-cyan-400/30 bg-black/95 py-1 shadow-2xl backdrop-blur">
                {[
                  { fmt: 'md', icon: FileText, label: t('novel.export.menu.md') },
                  { fmt: 'txt', icon: FileType2, label: t('novel.export.menu.txt') },
                  { fmt: 'json', icon: Braces, label: t('novel.export.menu.json') }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.fmt}
                      onClick={() => handleExport(item.fmt)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/70 transition hover:bg-cyan-400/10 hover:text-cyan-300"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        {/* 统计卡片 */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="rounded border border-cyan-400/15 bg-black/40 p-3 transition hover:border-cyan-300/40"
              >
                <div className="mb-2 flex items-center gap-1 text-[10px] tracking-widest text-cyan-300/40">
                  <Icon className="h-3 w-3" />
                  {s.label}
                </div>
                <div className="font-mono text-lg text-white">{s.value}</div>
              </div>
            );
          })}
        </section>

        {/* 快捷动作区 */}
        <section className="rounded border border-cyan-400/15 bg-black/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
            <Zap className="h-3.5 w-3.5" />
            {t('novel.overview.quickActions')}
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.key}
                  onClick={() => navigate(qa.to)}
                  className="flex items-center gap-2 rounded border border-cyan-400/30 bg-cyan-400/[0.04] px-3 py-2 text-[12px] tracking-wide text-cyan-300 transition hover:border-cyan-300/60 hover:bg-cyan-400/10"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(qa.labelKey)}
                </button>
              );
            })}
          </div>
        </section>

        {/* 待办看板 */}
        <section className="rounded border border-cyan-400/15 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-cyan-400/10 pb-2">
            <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('novel.overview.todo.title')}
            </div>
          </div>
          {todos.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-center text-[12px] text-emerald-300/60">
              <CheckCircle2 className="h-4 w-4" />
              {t('novel.overview.todo.empty')}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {todos.map((todo) => {
                const titleKey = `novel.overview.todo.${todo.key}.title`;
                const descKey = `novel.overview.todo.${todo.key}.desc`;
                const actionLabelKey = `novel.overview.action.${todo.actionKey}`;
                const title = todo.key === 'openIssues'
                  ? t(titleKey).replace('{{count}}', String(todo.count || 0))
                  : t(titleKey);
                return (
                  <li
                    key={todo.key}
                    className="flex items-start justify-between gap-3 rounded border border-amber-400/15 bg-amber-400/[0.03] p-3"
                  >
                    <div className="flex-1">
                      <div className="text-[12px] font-medium text-amber-200/80">{title}</div>
                      <div className="mt-0.5 text-[11px] leading-relaxed text-white/40">
                        {t(descKey)}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(todo.to)}
                      className="shrink-0 rounded border border-amber-400/30 px-2 py-1 text-[10px] tracking-wider text-amber-300 transition hover:bg-amber-400/10"
                    >
                      {t(actionLabelKey)} →
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 最近章节 + 大纲列表 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 最近章节 */}
          <section className="rounded border border-cyan-400/15 bg-black/40 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-cyan-400/10 pb-2">
              <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
                <BookOpen className="h-3.5 w-3.5" />
                {t('novel.overview.recentChapters')}
              </div>
              <button
                onClick={() => navigate(`/novels/${urlNovelId}/chapter`)}
                className="text-[10px] tracking-widest text-cyan-300/60 transition hover:text-cyan-300"
              >
                {t('nav.chapter')} →
              </button>
            </div>
            {recentChapters.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-white/30">
                {t('novel.overview.recentChapters.empty')}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {recentChapters.map((ch) => (
                  <li
                    key={ch.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-[12px] transition hover:bg-cyan-400/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-cyan-300/50">
                        #{ch.chapterNo ?? '-'}
                      </span>
                      <span className="text-white/80">{ch.title || '(未命名)'}</span>
                    </div>
                    <span className="text-[10px] text-white/30">
                      {formatTime(ch.updatedAt || ch.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 大纲版本 */}
          <section className="rounded border border-cyan-400/15 bg-black/40 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-cyan-400/10 pb-2">
              <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
                <ListTree className="h-3.5 w-3.5" />
                {t('novel.overview.tab.outline')}
              </div>
              <button
                onClick={() => navigate(`/novels/${urlNovelId}/outline`)}
                className="text-[10px] tracking-widest text-cyan-300/60 transition hover:text-cyan-300"
              >
                {t('nav.outline')} →
              </button>
            </div>
            {outlines.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-white/30">
                {t('novel.overview.recentChapters.empty')}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {outlines.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-[12px] transition hover:bg-cyan-400/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      {o.isActive ? (
                        <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 text-[9px] tracking-widest text-cyan-300">
                          {t('novel.overview.stat.activeOutline.yes')}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-white/30">v{o.version ?? '-'}</span>
                      )}
                      <span className="text-white/80">
                        {o.title || `#${o.id}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/30">
                      {formatTime(o.updatedAt || o.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* BASE-08 工作台时间线 */}
        <NovelTimeline events={timeline} />

        {/* BASE-12 AI 续写建议 */}
        <section className="rounded border border-cyan-400/15 bg-black/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-400/10 pb-2">
            <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
              <Sparkles className="h-3.5 w-3.5" />
              {t('novel.continuation.title')}
            </div>
            <div className="flex items-center gap-2">
              {suggestion?.generatedAt && (
                <span className="text-[10px] tracking-wider text-white/30">
                  {t('novel.continuation.generatedAt').replace(
                    '{{time}}',
                    formatGeneratedAt(suggestion.generatedAt)
                  )}
                </span>
              )}
              <button
                onClick={handleSuggest}
                disabled={suggesting}
                className="flex items-center gap-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[11px] tracking-wider text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50"
              >
                {suggesting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {t('novel.continuation.action')}
              </button>
            </div>
          </div>

          <p className="mb-3 text-[11px] leading-relaxed text-white/40">
            {t('novel.continuation.subtitle')}
          </p>

          {!suggestion ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Sparkles className="h-6 w-6 text-cyan-300/40" />
              <div className="text-[12px] text-cyan-300/70">
                {t('novel.continuation.empty.title')}
              </div>
              <div className="max-w-md text-[11px] leading-relaxed text-white/40">
                {t('novel.continuation.empty.desc')}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestion.title && (
                <div className="flex items-center gap-2 rounded border border-cyan-400/20 bg-cyan-400/[0.04] px-3 py-2">
                  <span className="rounded bg-cyan-400/15 px-2 py-0.5 font-mono text-[10px] tracking-widest text-cyan-300">
                    {t('novel.continuation.nextChapter').replace(
                      '{{no}}',
                      String(suggestion.nextChapterNo ?? '?')
                    )}
                  </span>
                  <span className="text-sm font-medium text-white">
                    {suggestion.title}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <SuggestionField
                  icon={Target}
                  label={t('novel.continuation.field.direction')}
                  value={suggestion.direction}
                />
                <SuggestionField
                  icon={Swords}
                  label={t('novel.continuation.field.conflict')}
                  value={suggestion.conflict}
                />
                <SuggestionField
                  icon={Flag}
                  label={t('novel.continuation.field.hook')}
                  value={suggestion.hook}
                />
                <SuggestionField
                  icon={Users}
                  label={t('novel.continuation.field.keyCharacters')}
                  value={
                    Array.isArray(suggestion.keyCharacters) &&
                    suggestion.keyCharacters.length > 0
                      ? suggestion.keyCharacters.join('、')
                      : ''
                  }
                />
              </div>

              {Array.isArray(suggestion.risks) && suggestion.risks.length > 0 && (
                <div className="rounded border border-amber-400/20 bg-amber-400/[0.04] p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wider text-amber-300/80">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {t('novel.continuation.field.risks')}
                  </div>
                  <ul className="ml-4 list-disc space-y-1 text-[11px] leading-relaxed text-white/60">
                    {suggestion.risks.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * 续写建议单字段渲染组件(BASE-12)。
 * @param {object} props
 * @param {React.ComponentType<{className?: string}>} props.icon
 * @param {string} props.label
 * @param {string} [props.value]
 */
function SuggestionField({ icon: Icon, label, value }) {
  const { t } = useI18n();
  return (
    <div className="rounded border border-white/10 bg-black/40 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] tracking-widest text-cyan-300/50">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-[12px] leading-relaxed text-white/80">
        {value || t('novel.continuation.field.empty')}
      </div>
    </div>
  );
}
