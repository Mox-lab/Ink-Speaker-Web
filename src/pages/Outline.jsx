import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Copy, ChevronRight, ArrowRight, History, Zap, Trash2, PenLine, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  outline as outlineApi,
  saveOutline as saveOutlineApi,
  listOutlines,
  getOutline,
  getActiveOutline,
  activateOutline,
  deleteOutline
} from '../api/index.js';
import EditableText from '../components/EditableText.jsx';
import HistoryDrawer from '../components/HistoryDrawer.jsx';
import SaveButton from '../components/SaveButton.jsx';
import DraftRestoreBanner from '../components/DraftRestoreBanner.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { useTask } from '../context/TaskContext.jsx';
import { STORAGE_KEYS, draftKey } from '../constants/storage.js';
import { loadDraft, saveDraft, clearDraft } from '../utils/storage.js';
import { useAutoSave } from '../hooks/useAutoSave.js';
import { parseOutline } from '../utils/parse.js';
import { useNovelId } from '../hooks/useNovelId.js';
import { trackEvent } from '../utils/track.js';
import { FUNNEL_EVENTS } from '../constants/funnelEvents.js';

/**
 * 模块级 Promise 缓存:让生成任务跨组件卸载/重新挂载存活。
 * 切走再切回时,如果上一次请求还没完成,继续复用同一个 Promise。
 *
 * 结构: { theme, chapters, lastOutline, promise }
 * - 完成或失败后会被清空
 * - 通过 attach 拿到当前 Promise,在组件挂载时调用以恢复加载态
 */
let pendingOutline = null;

function attachOutline(theme, chapters, opts = {}) {
  const lastOutline = opts.lastOutline || '';
  // 同参数的进行中请求复用
  if (
    pendingOutline &&
    pendingOutline.theme === theme &&
    pendingOutline.chapters === chapters &&
    (pendingOutline.lastOutline || '') === lastOutline
  ) {
    return pendingOutline.promise;
  }
  const entry = { theme, chapters, lastOutline, promise: outlineApi(theme, chapters, opts) };
  pendingOutline = entry;
  entry.promise.finally(() => {
    if (pendingOutline === entry) pendingOutline = null;
  });
  return entry.promise;
}

function clearPendingOutline() {
  pendingOutline = null;
}

/**
 * 解析大纲文本为章节节点数组。
 */

function FlowNode({ node, active, onClick, onJumpToChapter }) {
  return (
    <div
      className={`sf-scan relative flex w-64 shrink-0 cursor-pointer flex-col rounded border p-4 transition sm:w-72 ${
        active
          ? 'border-cyan-300 bg-cyan-400/[0.08] shadow-[0_0_24px_rgba(56,230,255,0.25)]'
          : 'border-cyan-400/15 bg-black/40 hover:border-cyan-300/50 hover:bg-cyan-400/[0.04]'
      }`}
    >
      <div
        onClick={onClick}
        className="flex h-full flex-col"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-cyan-300/40 bg-cyan-300/10 font-mono text-xs text-cyan-300">
              {String(node.no).padStart(2, '0')}
            </div>
            <span className="sf-chip">CHAPTER</span>
          </div>
          <span className="font-mono text-[10px] text-white/30">
            {String(node.index + 1).padStart(3, '0')}
          </span>
        </div>

        <div className="mb-2 text-sm font-bold leading-tight text-white">{node.title}</div>

        <div className="line-clamp-3 flex-1 text-xs leading-relaxed text-white/60">
          {node.summary || '(无摘要)'}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-cyan-400/10 pt-2 text-[10px] tracking-widest text-cyan-300/40">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onJumpToChapter?.(node);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              onJumpToChapter?.(node);
            }
          }}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-cyan-300/60 transition hover:bg-cyan-400/10 hover:text-cyan-300"
          title="以此节点为大纲跳转到章节页"
        >
          <PenLine className="h-3 w-3" />
          写此章
        </span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </div>
  );
}

export default function Outline() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const novelId = useNovelId();
  const { runTask } = useTask();
  const STORAGE_KEY = draftKey(STORAGE_KEYS.DRAFT_OUTLINE, novelId);
  const persisted = useMemo(() => loadDraft(STORAGE_KEY), [STORAGE_KEY]);
  const [theme, setTheme] = useState(persisted?.theme || '');
  const [chapters, setChapters] = useState(persisted?.chapters ?? 20);
  const [rawResult, setRawResult] = useState(persisted?.rawResult || '');
  const [loading, setLoading] = useState(!!persisted?.loading);
  const [activeNode, setActiveNode] = useState(null);
  const [continueMode, setContinueMode] = useState(false);

  // 历史
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  const scrollRef = useRef(null);

  const nodes = useMemo(() => parseOutline(rawResult), [rawResult]);

  // UX-05:大纲草稿对象(供 useAutoSave 使用)
  const draftState = useMemo(
    () => ({
      theme,
      chapters: Number(chapters) || 20,
      rawResult,
      loading,
      savedAt: Date.now()
    }),
    [theme, chapters, rawResult, loading]
  );

  const autoSave = useAutoSave(draftState, STORAGE_KEY, { interval: 5000, enabled: !loading });

  // 草稿恢复:挂载时若 persisted 非空且非 loading 飞行态,弹恢复提示
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);

  useEffect(() => {
    if (!persisted) return;
    // loading=true 表示上次生成还在飞行中,不弹恢复(交给挂载时 attach 逻辑处理)
    if (persisted.loading) return;
    if (persisted.rawResult || persisted.theme) {
      setPendingDraft(persisted);
      setShowRestoreBanner(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreDraft = (draft) => {
    if (!draft) return;
    if (typeof draft.theme === 'string') setTheme(draft.theme);
    if (Number.isFinite(Number(draft.chapters))) setChapters(Number(draft.chapters));
    if (typeof draft.rawResult === 'string') setRawResult(draft.rawResult);
    setShowRestoreBanner(false);
    setPendingDraft(null);
    toast.success(t('draft.restore'));
  };

  const handleDiscardDraft = () => {
    clearDraft(STORAGE_KEY);
    setTheme('');
    setRawResult('');
    setShowRestoreBanner(false);
    setPendingDraft(null);
    toast.success(t('draft.discard'));
  };

  const draftHint = useMemo(() => {
    if (!pendingDraft?.savedAt) return '';
    const mins = Math.max(0, Math.round((Date.now() - pendingDraft.savedAt) / 60000));
    return t('draft.hintMinutes').replace('{n}', String(mins));
  }, [pendingDraft, t]);

  // 持久化:必须带 loading,否则 generate() 写入 loading:true 后会被覆盖
  // 注:autoSave 已替代手写 useEffect,此处保留逻辑兼容(避免 lint 警告,实际不再需要)
  useEffect(() => {
    // 保留对首次写入的场景兜底:autoSave 在 enabled 时已写入
    // 仅在 disabled(loading 飞行)时显式保存一次,避免遗漏
    if (loading) {
      saveDraft(STORAGE_KEY, { theme, chapters: Number(chapters) || 20, rawResult, loading });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // 挂载时若上次请求仍在飞行中,attach 到同一个 Promise 继续等待
  useEffect(() => {
    if (!persisted?.loading) return;
    let cancelled = false;
    setLoading(true);
    attachOutline(persisted.theme, Number(persisted.chapters) || 20)
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          toast.error(data.error);
          return;
        }
        setRawResult(data.outline || '');
        toast.success(t('outline.generated', { n: persisted.chapters }).replace('{n}', persisted.chapters));
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(t('outline.generateFailed') + ':' + (err.response?.data?.message || err.message));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    if (!theme.trim()) {
      toast.error(t('outline.themeRequired'));
      return;
    }

    // 续生模式:先取当前激活版本作为接续基础
    let lastOutline = '';
    let startChapter = 1;
    if (continueMode) {
      try {
        const active = await getActiveOutline();
        if (active && active.content) {
          lastOutline = active.content;
          startChapter = (active.chapters || 0) + 1;
        } else {
          toast.info(t('outline.noActive'));
        }
      } catch (err) {
        toast.warn(t('outline.readActiveFailed'));
      }
    }

    setLoading(true);
    if (!continueMode) {
      setRawResult('');
    }
    setActiveNode(null);

    // UX-07:注册到任务面板
    const opts = continueMode && lastOutline ? { lastOutline, startChapter } : {};
    const taskTitle = `${t('task.type.outline')} · ${theme.slice(0, 20)}${continueMode ? ` (${t('outline.continueOn')})` : ''}`;
    runTask({
      type: 'outline_generate',
      title: taskTitle,
      params: { theme: theme.trim(), chapters: Number(chapters) || 20, continueMode, opts },
      run: () => attachOutline(theme.trim(), Number(chapters) || 20, opts),
      onSuccess: (data) => {
        if (data.error) {
          toast.error(data.error);
          return;
        }
        const newContent = data.outline || '';
        if (continueMode && lastOutline && newContent) {
          setRawResult((prev) => (prev ? prev + '\n\n' + newContent : newContent));
          toast.success(t('outline.continued').replace('{n}', chapters));
        } else {
          setRawResult(newContent);
          toast.success(t('outline.generated').replace('{n}', chapters));
        }
        // UX-11 漏斗:大纲生成成功
        trackEvent(
          FUNNEL_EVENTS.GENERATE_OUTLINE,
          { theme: theme.trim(), chapters: Number(chapters) || 20, continueMode },
          novelId
        );
      },
      successMsg: null
    });
    setLoading(false);
  };

  const reset = () => {
    setTheme('');
    setRawResult('');
    setActiveNode(null);
    setLoading(false);
    clearDraft(STORAGE_KEY);
    autoSave.clear();
    clearPendingOutline();
    toast.success(t('outline.resetDone'));
  };

  const copy = async () => {
    await navigator.clipboard.writeText(rawResult);
    toast.success(t('common.copied'));
  };

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  /** 跳转到章节页,并把当前节点的大纲作为预填数据透传 */
  const handleJumpToChapter = (node) => {
    setActiveNode(node);
    navigate(`/novels/${novelId}/chapter`, {
      state: {
        outlineText: node.summary || '',
        chapterNo: node.no,
        chapterTitle: node.title || '',
        from: 'outline'
      }
    });
  };

  /** 保存到数据库(新建版本) */
  const handleSave = async () => {
    if (!rawResult.trim()) throw new Error('内容为空');
    const payload = {
      title: theme ? theme.slice(0, 50) : `v-${new Date().toISOString().slice(0, 10)}`,
      theme,
      chapters: Number(chapters) || 20,
      content: rawResult
    };
    const data = await saveOutlineApi(payload);
    // 后端保存成功 → 清掉本大纲草稿
    autoSave.clear();
    if (data && data.id) {
      // 保存后刷新历史(若抽屉是开的)
      if (historyOpen) openHistory();
    }
    return data;
  };

  /** 拉取历史列表 */
  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const list = await listOutlines();
      setHistoryItems(
        (list || []).map((o) => ({
          id: o.id,
          title: o.title || `v${o.version}`,
          desc: o.contentPreview,
          meta: `v${o.version} · ${o.chapters || 0}章 · ${o.contentLength || 0}字`,
          active: !!o.isActive,
          version: o.version,
          chapters: o.chapters,
          contentLength: o.contentLength,
          createdAt: o.createdAt
        }))
      );
    } catch (err) {
      toast.error(t('outline.loadHistoryFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setHistoryLoading(false);
    }
  };

  /** 选中历史版本 → 加载到编辑区 */
  const handleSelectHistory = async (item) => {
    try {
      const detail = await getOutline(item.id);
      setRawResult(detail.content || '');
      if (detail.theme) setTheme(detail.theme);
      if (detail.chapters) setChapters(detail.chapters);
      setHistoryOpen(false);
      toast.success(t('outline.loadedVersion').replace('{n}', detail.version));
    } catch (err) {
      toast.error(t('outline.loadFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  /** 激活历史版本 */
  const handleActivateHistory = async (item) => {
    try {
      await activateOutline(item.id);
      setHistoryItems((prev) =>
        prev.map((x) => ({ ...x, active: x.id === item.id }))
      );
      toast.success(t('outline.activated').replace('{n}', item.version));
    } catch (err) {
      toast.error(t('outline.activateFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  /** 删除历史版本 */
  const handleDeleteHistory = async (item) => {
    try {
      await deleteOutline(item.id);
      setHistoryItems((prev) => prev.filter((x) => x.id !== item.id));
      toast.success(t('common.delete') + ' ✓');
    } catch (err) {
      toast.error(t('outline.deleteFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  const hasContent = !!rawResult && !loading;

  return (
    <div className="min-h-full p-4 sm:p-8">
      {/* 顶部标题区 */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="sf-heading">{t('outline.heading')}</div>
          <p className="mt-2 pl-4 text-[12px] tracking-wide text-cyan-300/50">
            {t('outline.subheading')}
          </p>
        </div>
        {nodes.length > 0 && (
          <div className="flex items-center gap-2 text-[10px] tracking-wider text-cyan-300/60 sm:gap-3 sm:text-xs">
            <span className="sf-dot" />
            <span>{t('outline.nodeCount').replace('{n}', String(nodes.length).padStart(2, '0'))}</span>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-7xl">
        {/* UX-05 草稿恢复提示 */}
        {showRestoreBanner && (
          <DraftRestoreBanner
            draft={pendingDraft}
            hint={draftHint}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}
        {/* 输入区 */}
        <div className="sf-panel-hud mb-6 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto]">
            <div>
              <label className="mb-1 block text-[10px] tracking-widest text-cyan-300/60">{t('outline.theme')}</label>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder={t('outline.themePlaceholder')}
                className="sf-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] tracking-widest text-cyan-300/60">{t('outline.chapters')}</label>
              <input
                type="number"
                min={5}
                max={100}
                value={chapters}
                onChange={(e) => setChapters(e.target.value)}
                className="sf-input w-full"
              />
            </div>
            <div className="flex items-end">
              <button onClick={generate} disabled={loading} className="sf-btn h-[42px] w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {loading ? t('outline.generating') : continueMode ? t('outline.continueOn') : t('outline.generate')}
              </button>
            </div>
          </div>

          {/* 二级操作行:续生 / 历史 / 保存 / 清空 */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cyan-400/10 pt-3">
            <button
              onClick={() => setContinueMode((v) => !v)}
              className={continueMode ? 'sf-btn' : 'sf-btn-ghost'}
              title={t('outline.continueHint')}
            >
              <Zap className="h-3 w-3" />
              {continueMode ? t('outline.continueOn') : t('outline.continueOff')}
            </button>
            <button onClick={openHistory} className="sf-btn-ghost">
              <History className="h-3 w-3" /> {t('outline.history')}
            </button>
            {hasContent && (
              <SaveButton onClick={handleSave} label={t('outline.saveAsNew')} />
            )}
            {(theme || rawResult) && !loading && (
              <button onClick={reset} className="sf-btn-ghost">
                <Trash2 className="h-3 w-3" /> {t('common.reset')}
              </button>
            )}
            {/* UX-05 自动保存状态指示 */}
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] tracking-widest text-cyan-300/40">
              {autoSave.status === 'pending' && (
                <>
                  <span className="sf-dot" />
                  {t('draft.autoSaving')}
                </>
              )}
              {autoSave.status === 'saving' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('draft.autoSaving')}
                </>
              )}
              {autoSave.status === 'saved' && (
                <>
                  <Check className="h-3 w-3 text-emerald-300/70" />
                  <span className="text-emerald-300/70">{t('draft.autoSaved')}</span>
                </>
              )}
            </span>
          </div>

          {loading && <div className="sf-loader-bar mt-3" />}
        </div>

        {/* 横向流程图视图 */}
        {loading ? (
          <div className="sf-panel-hud p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="sf-chip">FLOW</span>
                <span className="text-sm text-white/70">
                  {continueMode ? t('outline.continuingFlow') : t('outline.generatingFlow')}
                </span>
              </div>
              <span className="font-mono text-[10px] tracking-widest text-cyan-300/60">
                <span className="sf-dot" /> RUNNING
              </span>
            </div>
            <div className="sf-panel rounded border border-dashed border-cyan-400/10 py-20 text-center text-white/30">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-300/60" />
              <div className="font-mono text-xs tracking-widest">
                {continueMode ? 'CONTINUING OUTLINE FLOW...' : 'GENERATING OUTLINE FLOW...'}
              </div>
              <div className="mt-2 font-mono text-[10px] tracking-widest text-cyan-300/40">
                {t('outline.theme').toUpperCase()}: {theme || '(空)'} · {t('outline.chapters').toUpperCase()}: {chapters}
              </div>
            </div>
          </div>
        ) : nodes.length > 0 ? (
          <>
            {/* 流程图 */}
            <div className="sf-panel-hud p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="sf-chip">FLOW</span>
                  <span className="text-sm text-white/70">{t('outline.flowTitle')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => scrollBy(-1)} className="sf-btn-ghost">
                    ← {t('outline.left').toUpperCase()}
                  </button>
                  <button onClick={() => scrollBy(1)} className="sf-btn-ghost">
                    {t('outline.right').toUpperCase()} →
                  </button>
                  <button onClick={copy} className="sf-btn-ghost">
                    <Copy className="h-3 w-3" /> {t('common.copy').toUpperCase()}
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="sf-scroll-x flex items-stretch gap-2 overflow-x-auto pb-4"
                style={{ scrollBehavior: 'smooth' }}
              >
                {nodes.map((node, i) => (
                  <div key={i} className="flex items-stretch gap-2">
                    <FlowNode
                      node={node}
                      active={activeNode?.index === node.index}
                      onClick={() => setActiveNode(node)}
                      onJumpToChapter={handleJumpToChapter}
                    />
                    {i < nodes.length - 1 && (
                      <div className="flex items-center px-1 text-cyan-300/40">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {activeNode && (
                <div className="mt-4 rounded border border-cyan-400/20 bg-black/40 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="sf-chip">{t('outline.detail').toUpperCase()}</span>
                      <span className="text-sm font-bold text-white">
                        [{String(activeNode.no).padStart(2, '0')}] {activeNode.title}
                      </span>
                    </div>
                    <button
                      onClick={() => handleJumpToChapter(activeNode)}
                      className="flex items-center gap-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[11px] tracking-widest text-cyan-300 transition hover:bg-cyan-400/20"
                      title={t('outline.jumpToChapter')}
                    >
                      <PenLine className="h-3 w-3" />
                      {t('outline.jumpToChapter')}
                    </button>
                  </div>
                  <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/80">
                    {activeNode.summary}
                  </pre>
                </div>
              )}
            </div>

            {/* 全文编辑/保存区 */}
            <div className="sf-panel-hud mt-6 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="sf-chip">FULL TEXT</span>
                  <span className="text-sm text-white/70">{t('outline.fullText')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SaveButton onClick={handleSave} label={t('outline.saveAsNew')} variant="ghost" />
                </div>
              </div>
              <EditableText
                value={rawResult}
                onSave={async (newVal) => {
                  setRawResult(newVal);
                  // 直接落库:把当前编辑后的内容新建一个版本
                  await handleSave();
                }}
                rows={20}
                mono
                placeholder={t('outline.flowEmpty')}
              />
            </div>
          </>
        ) : (
          <div className="sf-panel rounded border border-dashed border-cyan-400/10 py-20 text-center text-white/30">
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <div className="text-xs tracking-wide">{t('outline.flowEmpty')}</div>
          </div>
        )}
      </div>

      {/* 历史抽屉 */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t('outline.history')}
        items={historyItems}
        loading={historyLoading}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
        renderMeta={(it) => (
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="font-mono text-[10px] tracking-widest text-cyan-300/40">{it.meta}</div>
            {!it.active && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivateHistory(it);
                }}
                className="font-mono text-[10px] tracking-widest text-amber-300/60 hover:text-amber-300"
              >
                {t('outline.activate').toUpperCase()}
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}
