import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, FileText, Copy, ChevronRight, ArrowRight, History, Zap, Trash2 } from 'lucide-react';
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
import { useI18n } from '../context/I18nContext.jsx';
import { STORAGE_KEYS } from '../constants/storage.js';
import { loadDraft, saveDraft, clearDraft } from '../utils/storage.js';
import { parseOutline } from '../utils/parse.js';

const STORAGE_KEY = STORAGE_KEYS.DRAFT_OUTLINE;

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

function FlowNode({ node, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`sf-scan relative flex w-72 shrink-0 cursor-pointer flex-col rounded border p-4 transition ${
        active
          ? 'border-cyan-300 bg-cyan-400/[0.08] shadow-[0_0_24px_rgba(56,230,255,0.25)]'
          : 'border-cyan-400/15 bg-black/40 hover:border-cyan-300/50 hover:bg-cyan-400/[0.04]'
      }`}
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

      <div className="mt-3 flex items-center justify-between border-t border-cyan-400/10 pt-2 text-[10px] tracking-widest text-cyan-300/40">
        <span>NODE</span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </div>
  );
}

export default function Outline() {
  const { t } = useI18n();
  const persisted = useMemo(() => loadDraft(STORAGE_KEY), []);
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

  // 持久化:必须带 loading,否则 generate() 写入 loading:true 后会被覆盖
  useEffect(() => {
    if (theme || rawResult || loading) {
      saveDraft(STORAGE_KEY, { theme, chapters: Number(chapters) || 20, rawResult, loading });
    }
  }, [theme, chapters, rawResult, loading]);

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

    try {
      const opts = continueMode && lastOutline ? { lastOutline, startChapter } : {};
      const data = await attachOutline(theme.trim(), Number(chapters) || 20, opts);
      if (data.error) {
        toast.error(data.error);
        return;
      }
      const newContent = data.outline || '';
      if (continueMode && lastOutline && newContent) {
        // 追加到现有内容(避免重复,简单以双换行分隔)
        setRawResult((prev) => (prev ? prev + '\n\n' + newContent : newContent));
        toast.success(t('outline.continued').replace('{n}', chapters));
      } else {
        setRawResult(newContent);
        toast.success(t('outline.generated').replace('{n}', chapters));
      }
    } catch (err) {
      toast.error(t('outline.generateFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTheme('');
    setRawResult('');
    setActiveNode(null);
    setLoading(false);
    clearDraft(STORAGE_KEY);
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
    <div className="min-h-screen p-8">
      {/* 顶部标题区 */}
      <header className="mb-6 flex items-end justify-between">
        <div>
          <div className="sf-heading">{t('outline.heading')}</div>
          <p className="mt-2 pl-4 font-mono text-[11px] tracking-wider text-cyan-300/50">
            // OUTLINE FLOW · {t('outline.subheading')}
          </p>
        </div>
        {nodes.length > 0 && (
          <div className="flex items-center gap-3 font-mono text-xs text-cyan-300/60">
            <span className="sf-dot" />
            <span>NODES: {String(nodes.length).padStart(2, '0')}</span>
            <span className="text-white/20">|</span>
            <span>FLOW READY</span>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-7xl">
        {/* 输入区 */}
        <div className="sf-panel-hud mb-6 p-4">
          <div className="grid grid-cols-[1fr_140px_auto] gap-3">
            <div>
              <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">// {t('outline.theme').toUpperCase()}</div>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder={t('outline.themePlaceholder')}
                className="sf-input w-full"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">// {t('outline.chapters').toUpperCase()}</div>
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
              <button onClick={generate} disabled={loading} className="sf-btn h-[42px]">
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
                className="flex items-stretch gap-2 overflow-x-auto pb-4"
                style={{ scrollBehavior: 'smooth' }}
              >
                {nodes.map((node, i) => (
                  <div key={i} className="flex items-stretch gap-2">
                    <FlowNode
                      node={node}
                      active={activeNode?.index === node.index}
                      onClick={() => setActiveNode(node)}
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
                  <div className="mb-2 flex items-center gap-2">
                    <span className="sf-chip">{t('outline.detail').toUpperCase()}</span>
                    <span className="text-sm font-bold text-white">
                      [{String(activeNode.no).padStart(2, '0')}] {activeNode.title}
                    </span>
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
            <div className="font-mono text-xs tracking-widest">// FLOW CHART WILL RENDER HERE</div>
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
