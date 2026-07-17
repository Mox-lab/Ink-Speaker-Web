import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  ListTree,
  UserCircle2,
  Globe,
  AlertTriangle,
  PenLine,
  Loader2,
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
  exportNovel,
  getContinuationSuggestion,
  getNovelOverview,
  listNovels,
  updateNovel
} from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useNovelContext } from '../context/NovelContext.jsx';
import { writeCachedNovelTitle } from '../components/NovelBreadcrumbBar.jsx';
import NovelTimeline from '../components/NovelTimeline.jsx';

/** 华为新魏字体栈(标题显示,全站统一)。 */
const XINWEI_FONT = {
  fontFamily: '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
};

/**
 * 导出冷却映射:同一本小说 60 秒内仅允许触发一次,防御连续点击。
 * key 为 novelId,value 为上次成功发起导出时的时间戳(ms)。
 * 使用模块级 Map,使冷却跨组件重挂载依然生效。
 */
const EXPORT_COOLDOWN_MS = 60 * 1000;
const lastExportAtByNovel = new Map();

/**
 * 小说总览页(进入小说后第一屏)。
 *
 * <p>第 6 阶段(以小说为主体):</p>
 * <ul>
 *   <li>调 getNovelOverview(novelId) 一次性拉取基础信息 + 各子模块统计 + 最近章节/大纲列表</li>
 *   <li>顶部展示小说标题/作者/简介 + 主操作按钮(继续写作 / 导出)</li>
 *   <li>中部展示 6 个统计卡片(章节/最新章节号/大纲版本/激活大纲/人物/设定/待审查问题)</li>
 *   <li>底部展示最近章节列表(最多 5 条)与大纲版本列表</li>
 * </ul>
 */
export default function NovelOverview() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { novelId: urlNovelId } = useParams();
  const { setActiveNovelId } = useNovelContext();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef(null);
  // 挂载标记:用于判断导出异步回调时本页是否仍可见,不可见则不再弹出任何提示
  const mountedRef = useRef(true);

  // 内联编辑状态(移除"编辑信息"按钮,改为标题/简介就地编辑)
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [savingField, setSavingField] = useState(false);
  const titleInputRef = useRef(null);
  const descInputRef = useRef(null);
  const titleMeasureRef = useRef(null);

  // 标题输入框:宽度随输入内容自适应(测量节点含 padding/border),最小 120px
  const autoSizeTitle = () => {
    const input = titleInputRef.current;
    const mirror = titleMeasureRef.current;
    if (!input || !mirror) return;
    mirror.textContent = input.value;
    input.style.width = `${Math.max(mirror.offsetWidth, 120)}px`;
  };
  // 简介文本框:高度随输入内容自动撑开
  const autoSizeDesc = () => {
    const el = descInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  // 当前用户拥有的小说标题集合(内联改名时做重名校验,口径同 NovelEditor)
  const [ownedTitles, setOwnedTitles] = useState(() => new Set());

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

  // 挂载标记:组件卸载后,导出异步回调不再弹出任何提示
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 加载本人拥有的小说标题,供内联改名时即时校验重名
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listNovels();
        if (cancelled || !Array.isArray(list)) return;
        const titles = new Set(
          list
            .filter((n) => !n.collaborator)
            .map((n) => (n.title || '').trim())
            .filter(Boolean)
        );
        if (!cancelled) setOwnedTitles(titles);
      } catch {
        /* 校验降级到后端 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 进入编辑态时自动聚焦并自适应尺寸
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      autoSizeTitle();
    }
  }, [editingTitle]);
  useEffect(() => {
    if (editingDesc && descInputRef.current) {
      descInputRef.current.focus();
      autoSizeDesc();
    }
  }, [editingDesc]);

  /**
   * 导出小说:后端异步导出,本页显示转圈,下载开始即停止转圈;
   * 离开本页后不再弹出任何提示;同一本小说 60 秒内仅允许导出一次。
   */
  const handleExport = useCallback(
    async (format) => {
      setExportOpen(false);
      // 防御:正在导出或冷却期内,直接拦截
      if (exporting) return;
      const now = Date.now();
      const last = lastExportAtByNovel.get(urlNovelId) || 0;
      if (now - last < EXPORT_COOLDOWN_MS) {
        if (mountedRef.current) toast.warning(t('novel.export.cooldown'));
        return;
      }
      // 以本次点击时间计入冷却(无论成功失败,60 秒内不可再次触发)
      lastExportAtByNovel.set(urlNovelId, now);
      setExporting(true);
      try {
        const { blob, filename } = await exportNovel(urlNovelId, format);
        // 开始下载:创建临时链接并触发浏览器下载
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // 下载已触发 → 停止转圈(由 finally 置 exporting=false);仅在本页时提示完成
        if (mountedRef.current) {
          toast.success(`${t('novel.export.completed')} · ${filename}`);
        }
      } catch (err) {
        if (mountedRef.current) {
          toast.error(t('novel.export.failed') + ':' + (err?.message || ''));
        }
      } finally {
        // 仅在本页时复位转圈状态,避免卸载后 setState 告警
        if (mountedRef.current) setExporting(false);
      }
    },
    [t, urlNovelId, exporting]
  );

  const handleContinueWriting = () => {
    navigate(`/novels/${urlNovelId}/writing`);
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

  /** 内联保存:合并当前 overview 字段 + 局部补丁,调 updateNovel 并刷新本地状态。 */
  const patchNovel = async (patch) => {
    setSavingField(true);
    try {
      const payload = {
        title: overview.title,
        description: overview.description ?? null,
        sharedForReference: !!overview.sharedForReference,
        ...patch
      };
      await updateNovel(urlNovelId, payload);
      setOverview((prev) => ({ ...prev, ...patch }));
      if (patch.title != null) writeCachedNovelTitle(urlNovelId, patch.title);
      toast.success(t('novel.editor.edit.success'));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || t('novel.overview.fetch.failed'));
    } finally {
      setSavingField(false);
    }
  };

  /** 进入标题编辑:预填当前标题。 */
  const startEditTitle = () => {
    setDraftTitle(overview.title || '');
    setEditingTitle(true);
  };

  /** 提交标题:空/未变/重名则取消或提示,否则保存。 */
  const commitTitle = async () => {
    const next = draftTitle.trim();
    setEditingTitle(false);
    setDraftTitle('');
    if (!next || next === (overview.title || '').trim()) return;
    if (ownedTitles.has(next)) {
      toast.error(t('novel.editor.validate.title.duplicate'));
      return;
    }
    await patchNovel({ title: next });
  };

  /** 进入简介编辑:预填当前简介。 */
  const startEditDesc = () => {
    setDraftDesc(overview.description || '');
    setEditingDesc(true);
  };

  /** 提交简介:未变则取消,否则保存(null 表示清空)。 */
  const commitDesc = async () => {
    const next = draftDesc.trim();
    setEditingDesc(false);
    setDraftDesc('');
    if (next === (overview.description || '').trim()) return;
    await patchNovel({ description: next || null });
  };

  /** 切换公开/私有:仅 owner 可操作,复用 patchNovel 保存 sharedForReference 字段。 */
  const toggleShared = () => {
    if (!isOwner || savingField) return;
    patchNovel({ sharedForReference: !overview.sharedForReference });
  };

  /** 标题输入框按键:Enter 提交,Esc 取消。 */
  const onTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTitle();
    } else if (e.key === 'Escape') {
      setEditingTitle(false);
      setDraftTitle('');
    }
  };

  /** 简介输入框按键:Esc 取消(多行,换行用默认行为)。 */
  const onDescKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditingDesc(false);
      setDraftDesc('');
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

  // 按实际小说创作顺序展示:大纲 → 激活大纲 → 人物 → 设定 → 章节 → 最新章节 → 待审查问题
  const stats = [
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
      key: 'issues',
      label: t('novel.overview.stat.issues'),
      value: overview.unresolvedIssueCount ?? 0,
      icon: AlertTriangle
    }
  ];

  const recentChapters = overview.recentChapters || [];
  const outlines = overview.outlines || [];
  const timeline = overview.timeline || [];

  // 当前用户是否本书 owner(BASE-11):协作者管理面板 / 编辑·删除按钮仅 owner 可见
  const isOwner = overview?.role === 'owner';

  // 内联改名时的重名校验(排除自身原标题)
  const titleInvalid =
    editingTitle &&
    !!draftTitle.trim() &&
    ownedTitles.has(draftTitle.trim()) &&
    draftTitle.trim() !== (overview.title || '').trim();

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
          <div className="flex-1">
            {/* 页面标题 + 公开/私有切换:切换按钮紧贴标题文本右侧 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="sf-heading">{t('novel.overview.title')}</div>
              {/* 公开/私有切换:仅 owner 可点击切换,非 owner 仅展示状态 */}
              {isOwner ? (
                <button
                  onClick={toggleShared}
                  disabled={savingField}
                  className={`flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-2xs transition disabled:opacity-50 ${
                    overview.sharedForReference
                      ? 'bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                  title={
                    overview.sharedForReference
                      ? t('novel.overview.togglePrivate')
                      : t('novel.overview.toggleShared')
                  }
                >
                  <Globe className="h-3 w-3" />
                  {overview.sharedForReference
                    ? t('novel.list.card.shared')
                    : t('novel.list.card.private')}
                </button>
              ) : (
                <span
                  className={`flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-2xs ${
                    overview.sharedForReference ? 'bg-cyan-400/10 text-cyan-300' : 'bg-white/5 text-white/40'
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  {overview.sharedForReference ? t('novel.list.card.shared') : t('novel.list.card.private')}
                </span>
              )}
            </div>

            {/* 信息区:左=基础信息三行(标题/作者/简介);右=操作按钮,整体下沉贴 header 底线 */}
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              {/* 左:基础信息(标题 + 改名 + 公开/私有 + 作者/时间 + 简介) */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {/* 标题行:小说名(可内联改名) */}
                <div className="flex flex-wrap items-center gap-2">
                  {editingTitle ? (
                    <>
                      <input
                        ref={titleInputRef}
                        value={draftTitle}
                        onChange={(e) => {
                          setDraftTitle(e.target.value);
                          autoSizeTitle();
                        }}
                        onKeyDown={onTitleKeyDown}
                        onBlur={commitTitle}
                        maxLength={20}
                        className={`sf-input shrink-0 !py-1 text-2xl font-bold ${
                          titleInvalid ? 'border-red-400/60' : ''
                        }`}
                      />
                      {/* 隐藏测量节点:用于标题输入框宽度自适应(含 padding/border) */}
                      <span
                        ref={titleMeasureRef}
                        className="pointer-events-none invisible absolute whitespace-nowrap text-2xl font-bold"
                        style={{ padding: '0 14px', border: '1px solid transparent', boxSizing: 'border-box' }}
                      >
                        {draftTitle}
                      </span>
                    </>
                  ) : (
                    <span className="group relative inline-flex max-w-full items-center">
                      <span
                        className="min-w-0 truncate text-2xl font-bold leading-tight text-white"
                        style={XINWEI_FONT}
                      >
                        {overview.title || '(未命名)'}
                      </span>
                      {isOwner && (
                        <button
                          onClick={startEditTitle}
                          className="ml-1.5 inline-flex shrink-0 items-center rounded p-0.5 text-cyan-300/0 transition group-hover:text-cyan-300/50 hover:!text-cyan-300"
                          title={t('novel.overview.action.editTitle')}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  )}
                </div>

                {/* 更新时间:紧贴小说信息下方左对齐(作者信息已移除) */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs tracking-wider text-white/30">
                  <span className="whitespace-nowrap">
                    {t('novel.list.card.updatedAt')}: {formatTime(overview.updatedAt)}
                  </span>
                </div>

                {/* 简介:可内联编辑;笔形图标悬停时显隐于文本尾部,与文本融为一体;文本框高度随内容自适应 */}
                <div className="group relative max-w-2xl self-start">
                  {editingDesc ? (
                    <textarea
                      ref={descInputRef}
                      value={draftDesc}
                      onChange={(e) => {
                        setDraftDesc(e.target.value);
                        autoSizeDesc();
                      }}
                      onKeyDown={onDescKeyDown}
                      onBlur={commitDesc}
                      rows={3}
                      maxLength={100}
                      className="sf-input w-full resize-none text-xs"
                    />
                  ) : (
                    <>
                      <span
                        onClick={isOwner ? startEditDesc : undefined}
                        className={`inline align-middle leading-relaxed ${
                          overview.description ? 'text-white/60' : 'text-white/30 italic'
                        } ${isOwner ? 'cursor-pointer' : ''}`}
                      >
                        {overview.description || t('novel.overview.descPlaceholder')}
                      </span>
                      {isOwner && (
                        <button
                          onClick={startEditDesc}
                          className="ml-1 inline-flex shrink-0 align-middle rounded p-0.5 text-cyan-300/0 transition group-hover:text-cyan-300/50 hover:!text-cyan-300"
                          title={t('novel.overview.action.editDesc')}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 右:操作按钮(继续写作 + 导出),下沉贴 header 底线 */}
              <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 pb-1 sm:w-auto">
                <button
                  onClick={handleContinueWriting}
                  className="flex items-center gap-2 rounded border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
                >
                  <PenLine className="h-4 w-4" />
                  {t('novel.overview.action.continueWriting')}
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
                    <div className="absolute right-0 z-20 mt-1 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded border border-cyan-400/30 bg-black/95 py-1 shadow-2xl backdrop-blur">
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
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 transition hover:bg-cyan-400/10 hover:text-cyan-300"
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
            </div>
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
                <div className="mb-2 flex items-center gap-1 text-2xs tracking-widest text-cyan-300/40">
                  <Icon className="h-3 w-3" />
                  {s.label}
                </div>
                <div className="font-mono text-lg text-white">{s.value}</div>
              </div>
            );
          })}
        </section>

        {/* 待办看板 */}
        <section className="rounded border border-cyan-400/15 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-cyan-400/10 pb-2">
            <div className="flex items-center gap-2 text-xs tracking-widest text-cyan-300/60">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('novel.overview.todo.title')}
            </div>
          </div>
          {todos.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-center text-xs text-emerald-300/60">
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
                      <div className="text-xs font-medium text-amber-200/80">{title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-white/40">
                        {t(descKey)}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(todo.to)}
                      className="shrink-0 rounded border border-amber-400/30 px-2 py-1 text-2xs tracking-wider text-amber-300 transition hover:bg-amber-400/10"
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
              <div className="flex items-center gap-2 text-xs tracking-widest text-cyan-300/60">
                <BookOpen className="h-3.5 w-3.5" />
                {t('novel.overview.recentChapters')}
              </div>
              <button
                onClick={() => navigate(`/novels/${urlNovelId}/chapter`)}
                className="text-2xs tracking-widest text-cyan-300/60 transition hover:text-cyan-300"
              >
                {t('nav.chapter')} →
              </button>
            </div>
            {recentChapters.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/30">
                {t('novel.overview.recentChapters.empty')}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {recentChapters.map((ch) => (
                  <li
                    key={ch.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-xs transition hover:bg-cyan-400/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs text-cyan-300/50">
                        #{ch.chapterNo ?? '-'}
                      </span>
                      <span className="text-white/80">{ch.title || '(未命名)'}</span>
                    </div>
                    <span className="text-2xs text-white/30">
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
              <div className="flex items-center gap-2 text-xs tracking-widest text-cyan-300/60">
                <ListTree className="h-3.5 w-3.5" />
                {t('novel.overview.tab.outline')}
              </div>
              <button
                onClick={() => navigate(`/novels/${urlNovelId}/outline`)}
                className="text-2xs tracking-widest text-cyan-300/60 transition hover:text-cyan-300"
              >
                {t('nav.outline')} →
              </button>
            </div>
            {outlines.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/30">
                {t('novel.overview.recentChapters.empty')}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {outlines.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-xs transition hover:bg-cyan-400/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      {o.isActive ? (
                        <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 text-2xs tracking-widest text-cyan-300">
                          {t('novel.overview.stat.activeOutline.yes')}
                        </span>
                      ) : (
                        <span className="font-mono text-2xs text-white/30">v{o.version ?? '-'}</span>
                      )}
                      <span className="text-white/80">
                        {o.title || `#${o.id}`}
                      </span>
                    </div>
                    <span className="text-2xs text-white/30">
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
            <div className="flex items-center gap-2 text-xs tracking-widest text-cyan-300/60">
              <Sparkles className="h-3.5 w-3.5" />
              {t('novel.continuation.title')}
            </div>
            <div className="flex items-center gap-2">
              {suggestion?.generatedAt && (
                <span className="text-2xs tracking-wider text-white/30">
                  {t('novel.continuation.generatedAt').replace(
                    '{{time}}',
                    formatGeneratedAt(suggestion.generatedAt)
                  )}
                </span>
              )}
              <button
                onClick={handleSuggest}
                disabled={suggesting}
                className="flex items-center gap-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs tracking-wider text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50"
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

          <p className="mb-3 text-xs leading-relaxed text-white/40">
            {t('novel.continuation.subtitle')}
          </p>

          {!suggestion ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Sparkles className="h-6 w-6 text-cyan-300/40" />
              <div className="text-xs text-cyan-300/70">
                {t('novel.continuation.empty.title')}
              </div>
              <div className="max-w-md text-xs leading-relaxed text-white/40">
                {t('novel.continuation.empty.desc')}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestion.title && (
                <div className="flex items-center gap-2 rounded border border-cyan-400/20 bg-cyan-400/[0.04] px-3 py-2">
                  <span className="rounded bg-cyan-400/15 px-2 py-0.5 font-mono text-2xs tracking-widest text-cyan-300">
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
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs tracking-wider text-amber-300/80">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {t('novel.continuation.field.risks')}
                  </div>
                  <ul className="ml-4 list-disc space-y-1 text-xs leading-relaxed text-white/60">
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
      <div className="mb-1 flex items-center gap-1.5 text-2xs tracking-widest text-cyan-300/50">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-xs leading-relaxed text-white/80">
        {value || t('novel.continuation.field.empty')}
      </div>
    </div>
  );
}
