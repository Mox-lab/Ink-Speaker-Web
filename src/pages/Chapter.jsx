import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Loader2,
  BookOpen,
  Copy,
  Sparkles,
  FileText,
  History,
  Trash2,
  Shield,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Columns2,
  AlignJustify,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import {
  chapterWithSkill,
  saveChapter,
  listChapters,
  getChapter,
  deleteChapter,
  getActiveOutline,
  listSkills,
  previewSkill
} from '../api/index.js';
import EditableText from '../components/EditableText.jsx';
import HistoryDrawer from '../components/HistoryDrawer.jsx';
import SaveButton from '../components/SaveButton.jsx';
import ReviewSidebar from '../components/ReviewSidebar.jsx';
import InlineAIAssistant from '../components/InlineAIAssistant.jsx';
import DraftRestoreBanner from '../components/DraftRestoreBanner.jsx';
import CharacterPanel from '../components/editor/CharacterPanel.jsx';
import SettingPanel from '../components/editor/SettingPanel.jsx';
import ConflictResolver from '../components/ConflictResolver.jsx';
import ChapterHistoryPanel from '../components/ChapterHistoryPanel.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { useTask } from '../context/TaskContext.jsx';
import { STORAGE_KEYS, draftKey } from '../constants/storage.js';
import { loadDraft, clearDraft, appendLocal } from '../utils/storage.js';
import { useAutoSave } from '../hooks/useAutoSave.js';
import { parseOutline } from '../utils/parse.js';
import { useNovelId } from '../hooks/useNovelId.js';
import { trackEvent } from '../utils/track.js';
import { FUNNEL_EVENTS } from '../constants/funnelEvents.js';

export default function Chapter() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const novelId = useNovelId();
  const { runTask } = useTask();
  const STORAGE_KEY = draftKey(STORAGE_KEYS.DRAFT_CHAPTER, novelId);
  const persisted = useMemo(() => loadDraft(STORAGE_KEY), [STORAGE_KEY]);

  // 从大纲节点跳转过来的预填数据(仅在 location.state 存在时使用一次)
  const prefilled = location.state;
  const hasOutlinePrefill = !!prefilled && !!prefilled.outlineText;
  // banner 仅在本屏会话内显示,刷新后不再出现
  const [showPrefillBanner, setShowPrefillBanner] = useState(hasOutlinePrefill);

  const [sessionId, setSessionId] = useState(persisted?.sessionId || 'chapter-001');
  const [outlineText, setOutlineText] = useState(
    hasOutlinePrefill ? prefilled.outlineText : persisted?.outlineText || ''
  );
  const [wordCount, setWordCount] = useState(persisted?.wordCount ?? 2000);
  const [chapterNo, setChapterNo] = useState(
    hasOutlinePrefill && Number.isFinite(Number(prefilled.chapterNo))
      ? Number(prefilled.chapterNo)
      : persisted?.chapterNo ?? 1
  );
  const [chapterTitle, setChapterTitle] = useState(
    hasOutlinePrefill ? prefilled.chapterTitle || '' : persisted?.chapterTitle || ''
  );
  const [result, setResult] = useState(persisted?.result || '');
  const [loading, setLoading] = useState(false);

  // P1 新增:Skill 系统
  const [skills, setSkills] = useState([]);
  const [skillId, setSkillId] = useState('');           // '' 表示自动匹配
  const [previewedSkill, setPreviewedSkill] = useState(null);

  // P1 新增:审查侧栏
  const [reviewOpen, setReviewOpen] = useState(false);

  // UX-03:三栏布局开关与栏显隐(刷新后保留)
  const [threeCol, setThreeCol] = useState(() => {
    try {
      return localStorage.getItem('ink_realm_chapter_three_col') !== '0';
    } catch {
      return true;
    }
  });
  const [showOutlinePane, setShowOutlinePane] = useState(true);
  const [showAIPane, setShowAIPane] = useState(true);

  // 左栏:激活大纲节点列表(用于点击预填到正文大纲)
  const [outlineNodes, setOutlineNodes] = useState([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [activeOutlineNodeId, setActiveOutlineNodeId] = useState(null);

  // 历史
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  // UX-06:右栏 AI 助手 / 人物 / 设定 tab 切换
  const [rightTab, setRightTab] = useState('ai');

  // UX-08:多设备冲突检测
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictChapterId, setConflictChapterId] = useState(null);
  // 当前章节加载时的服务端 updatedAt,作为下次保存时的 clientUpdatedAt
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState(null);
  // 强制保存标记:冲突后用户选择"强制本地"时,下次 saveChapter 不带 clientUpdatedAt
  const [forceSave, setForceSave] = useState(false);

  // BASE-07:章节历史快照面板
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyPanelChapterId, setHistoryPanelChapterId] = useState(null);

  const editorRef = useRef(null);

  // 加载 Skill 列表
  useEffect(() => {
    listSkills()
      .then((list) => setSkills(list || []))
      .catch(() => {});
  }, []);

  // 加载激活大纲,解析为节点列表(左栏使用)
  const loadOutlineNodes = async () => {
    setOutlineLoading(true);
    try {
      const active = await getActiveOutline();
      if (active && active.content) {
        const parsed = parseOutline(active.content);
        setOutlineNodes(parsed);
      } else {
        setOutlineNodes([]);
      }
    } catch {
      setOutlineNodes([]);
    } finally {
      setOutlineLoading(false);
    }
  };

  useEffect(() => {
    loadOutlineNodes();
  }, []);

  // 三栏布局开关持久化
  useEffect(() => {
    try {
      localStorage.setItem('ink_realm_chapter_three_col', threeCol ? '1' : '0');
    } catch {
      // 静默失败
    }
  }, [threeCol]);

  // 大纲变化时预览命中的 Skill
  useEffect(() => {
    if (!outlineText.trim()) {
      setPreviewedSkill(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const r = await previewSkill(outlineText, skillId || undefined);
        setPreviewedSkill(r);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [outlineText, skillId]);

  // UX-05:章节状态草稿对象(供 useAutoSave + 草稿恢复 banner 使用)
  const draftState = useMemo(
    () => ({
      sessionId,
      outlineText,
      wordCount: Number(wordCount) || 2000,
      chapterNo: Number(chapterNo) || 1,
      chapterTitle,
      result,
      savedAt: Date.now()
    }),
    [sessionId, outlineText, wordCount, chapterNo, chapterTitle, result]
  );

  const autoSave = useAutoSave(draftState, STORAGE_KEY, { interval: 5000, enabled: !loading });

  // 进入页面检测草稿:仅当来自普通挂载(非大纲预填)时弹草稿恢复提示
  // 预填场景 hasOutlinePrefill=true 时优先使用预填值,不弹恢复
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);

  useEffect(() => {
    if (hasOutlinePrefill) return;           // 大纲跳转过来,优先预填
    if (!persisted) return;                   // 没有草稿,不弹
    // 简单策略:只要草稿里有 result 或 outlineText,就弹恢复提示
    if (persisted.result || persisted.outlineText) {
      setPendingDraft(persisted);
      setShowRestoreBanner(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreDraft = (draft) => {
    if (!draft) return;
    if (draft.sessionId) setSessionId(draft.sessionId);
    if (typeof draft.outlineText === 'string') setOutlineText(draft.outlineText);
    if (Number.isFinite(Number(draft.wordCount))) setWordCount(Number(draft.wordCount));
    if (Number.isFinite(Number(draft.chapterNo))) setChapterNo(Number(draft.chapterNo));
    if (typeof draft.chapterTitle === 'string') setChapterTitle(draft.chapterTitle);
    if (typeof draft.result === 'string') setResult(draft.result);
    setShowRestoreBanner(false);
    setPendingDraft(null);
    toast.success(t('draft.restore'));
  };

  const handleDiscardDraft = () => {
    clearDraft(STORAGE_KEY);
    setShowRestoreBanner(false);
    setPendingDraft(null);
  };

  const draftHint = useMemo(() => {
    if (!pendingDraft?.savedAt) return '';
    const mins = Math.max(0, Math.round((Date.now() - pendingDraft.savedAt) / 60000));
    return t('draft.hintMinutes').replace('{n}', String(mins));
  }, [pendingDraft, t]);

  // 从大纲跳转过来的预填:用一次性 toast 提示用户(同时清理 location.state,避免刷新后仍触发)
  useEffect(() => {
    if (!hasOutlinePrefill) return;
    toast.success(
      t('outline.prefilledFromOutline') +
        (Number.isFinite(Number(prefilled.chapterNo))
          ? ` · #${prefilled.chapterNo}`
          : '')
    );
    // 替换当前 history state,清掉 template 数据,避免刷新时再次提示
    navigate(location.pathname, { replace: true, state: null });
    // 预填 banner 5 秒后自动消失
    const timer = setTimeout(() => setShowPrefillBanner(false), 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 从激活大纲中加载下一章大纲片段(简易:按双换行切块) */
  const loadNextFromOutline = async () => {
    try {
      const active = await getActiveOutline();
      if (!active || !active.content) {
        toast.info(t('outline.noOutline'));
        return;
      }
      // 按"第X章"或段落切块,选取第 chapterNo 块
      const blocks = active.content
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      // 简单匹配:找出包含"第N章"或编号的块
      const idx = Math.max(0, Math.min(blocks.length - 1, Number(chapterNo) - 1));
      const block = blocks[idx];
      if (block) {
        setOutlineText(block);
        if (!chapterTitle) {
          const m = block.match(/第[零一二三四五六七八九十百千\d]+章[^\n]*/);
          if (m) setChapterTitle(m[0]);
        }
        toast.success(t('outline.loadedSegment').replace('{n}', idx + 1));
      }
    } catch (err) {
      toast.error(t('outline.loadFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  /** 点击左栏大纲节点,把该节点摘要载入到正文大纲 textarea */
  const handlePickOutlineNode = (node) => {
    setActiveOutlineNodeId(node.index);
    setOutlineText(node.summary || node.title || '');
    if (!chapterTitle && node.title) {
      setChapterTitle(node.title);
    }
    if (Number.isFinite(Number(node.no))) {
      setChapterNo(Number(node.no));
    }
    toast.success(t('outline.loadedSegment').replace('{n}', node.no));
  };

  /** 把 AI 助手输出插入到正文末尾 */
  const handleInsertAIText = (text) => {
    if (!text) return;
    setResult((prev) => (prev ? prev + '\n\n' + text : text));
    toast.success(t('chapter.inline.inserted'));
  };

  /** UX-06:把人物名插入到正文末尾 */
  const handleInsertCharacterName = (name) => {
    if (!name) return;
    setResult((prev) => (prev ? prev + name : name));
  };

  const generate = async () => {
    if (!outlineText.trim()) {
      toast.error(t('chapter.outlineRequired'));
      return;
    }
    setLoading(true);
    setResult('');
    // UX-07:把章节生成注册到全局任务面板
    const title = t('chapter.chapterTitle')
      .replace('{n}', chapterNo)
      .replace('{title}', chapterTitle || t('chapter.placeholder'));
    runTask({
      type: 'chapter_generate',
      title: `${t('task.type.chapter')} · ${title}`,
      params: { sessionId, outlineText, skillId, wordCount, chapterNo },
      run: () =>
        chapterWithSkill(
          sessionId.trim() || 'chapter-001',
          outlineText.trim(),
          skillId || undefined,
          Number(wordCount) || 2000
        ),
      onSuccess: (data) => {
        if (data.error) {
          toast.error(data.error);
          return;
        }
        setResult(data.chapter || data.content || JSON.stringify(data, null, 2));
        if (data.skillName) {
          toast.success(t('chapter.generatedWithSkill').replace('{name}', data.skillName));
        } else {
          toast.success(t('chapter.generated'));
        }
        try {
          appendLocal(STORAGE_KEYS.TOKEN_LOG, {
            at: Date.now(),
            chars: (outlineText.length || 0) + (data.content?.length || 0)
          });
        } catch {}
        // UX-11 漏斗:首章生成成功
        trackEvent(
          FUNNEL_EVENTS.WRITE_FIRST_CHAPTER,
          { chapterNo: Number(chapterNo) || 1, wordCount: Number(wordCount) || 2000 },
          novelId
        );
      },
      successMsg: null
    });
    // 立即结束 loading 态(任务由 TaskPanel 接管 UI)
    setLoading(false);
  };

  const reset = () => {
    setOutlineText('');
    setResult('');
    setChapterTitle('');
    autoSave.clear();
    toast.success(t('chapter.reset'));
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    toast.success(t('common.copied'));
  };

  /** 保存到数据库(同 novelId+chapterNo 覆盖) */
  const handleSave = async () => {
    if (!result.trim()) throw new Error('内容为空');
    const payload = {
      chapterNo: Number(chapterNo) || 1,
      title: chapterTitle || `第 ${chapterNo} 章`,
      content: result,
      sessionId,
      wordCount: Number(result.length)
    };
    // UX-08:多设备冲突检测 — 除非 forceSave,都带上 clientUpdatedAt
    if (!forceSave && loadedUpdatedAt) {
      payload.clientUpdatedAt = loadedUpdatedAt;
    }
    try {
      const data = await saveChapter(payload);
      // 后端保存成功 → 清掉本章节草稿 + 重置 conflict 标记
      autoSave.clear();
      setForceSave(false);
      // UX-11 漏斗:章节保存成功
      trackEvent(
        FUNNEL_EVENTS.SAVE_CHAPTER,
        { chapterNo: Number(chapterNo) || 1, wordCount: Number(result.length) },
        novelId
      );
      // 服务端刚刚保存成功,新的 updatedAt 应当重新获取(下次保存作为 clientUpdatedAt)
      // 简化处理:暂保持 loadedUpdatedAt 不变,即使下次保存触发冲突也只是再弹一次
      return data;
    } catch (err) {
      // UX-08:后端返回 4091 → 弹冲突合并对话框
      if (err?.businessCode === 4091) {
        // 找出当前章节 ID(通过历史列表或已加载的 chapter)
        // 此处简化:直接从 historyItems 中按 chapterNo 查
        const matched = historyItems.find((x) => x.chapterNo === Number(chapterNo));
        const chId = matched?.id;
        if (chId) {
          setConflictChapterId(chId);
          setConflictOpen(true);
        }
      }
      throw err;
    }
  };

  /** UX-08:冲突对话框 — 采用服务端版本 */
  const handleConflictUseServer = (serverContent, serverChapter) => {
    setResult(serverContent || '');
    if (serverChapter?.chapterNo) setChapterNo(serverChapter.chapterNo);
    if (serverChapter?.title) setChapterTitle(serverChapter.title);
    if (serverChapter?.sessionId) setSessionId(serverChapter.sessionId);
    setLoadedUpdatedAt(serverChapter?.updatedAt || null);
    setForceSave(false);
    setConflictOpen(false);
    setConflictChapterId(null);
    toast.success(t('chapter.conflict.resolved'));
  };

  /** UX-08:冲突对话框 — 强制使用本地版本 */
  const handleConflictForceLocal = () => {
    setForceSave(true);
    setConflictOpen(false);
    setConflictChapterId(null);
    toast.success(t('chapter.conflict.forced'));
    // 立即触发一次保存(不带 clientUpdatedAt,绕过冲突检测)
    handleSave().catch((err) => {
      toast.error(t('chapter.saveFailed') + ':' + (err.response?.data?.message || err.message));
    });
  };

  /** BASE-07:打开章节历史快照面板 */
  const handleOpenHistoryPanel = async () => {
    // 当前章节 ID 优先用 historyPanelChapterId;否则从历史列表中按 chapterNo 查
    if (!historyPanelChapterId) {
      try {
        const list = await listChapters();
        const matched = (list || []).find((x) => x.chapterNo === Number(chapterNo));
        if (matched) setHistoryPanelChapterId(matched.id);
      } catch {}
    }
    setHistoryPanelOpen(true);
  };

  /** BASE-07:从历史快照回滚到正文 */
  const handleRestoreHistory = (content, snapshot) => {
    setResult(content || '');
    if (snapshot?.title) setChapterTitle(snapshot.title);
    setForceSave(true); // 历史回滚也算"本地强制"
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const list = await listChapters();
      setHistoryItems(
        (list || []).map((c) => ({
          id: c.id,
          title: `第 ${c.chapterNo} 章 · ${c.title || ''}`,
          desc: c.contentPreview,
          meta: `${c.wordCount || 0}字 · ${c.createdAt || ''}`.trim(),
          chapterNo: c.chapterNo,
          wordCount: c.wordCount,
          createdAt: c.createdAt
        }))
      );
    } catch (err) {
      toast.error(t('outline.loadHistoryFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectHistory = async (item) => {
    try {
      const detail = await getChapter(item.id);
      setResult(detail.content || '');
      setChapterNo(detail.chapterNo || 1);
      setChapterTitle(detail.title || '');
      if (detail.sessionId) setSessionId(detail.sessionId);
      // UX-08:记录加载时的服务端 updatedAt,用于下次保存的多设备冲突检测
      setLoadedUpdatedAt(detail.updatedAt || null);
      setForceSave(false);
      // BASE-07:记录章节 ID 供历史快照面板使用
      setHistoryPanelChapterId(detail.id);
      setHistoryOpen(false);
      toast.success(t('chapter.chapterLoaded').replace('{n}', detail.chapterNo));
    } catch (err) {
      toast.error(t('chapter.loadChapterFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteHistory = async (item) => {
    try {
      await deleteChapter(item.id);
      setHistoryItems((prev) => prev.filter((x) => x.id !== item.id));
      toast.success(t('common.delete') + ' ✓');
    } catch (err) {
      toast.error(t('chapter.deleteFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  const hasContent = !!result && !loading;

  // 三栏布局:左栏大纲节点 / 中栏正文 / 右栏 AI 助手
  // 小屏(< lg)自动退化为单栏,通过 toggle 在三栏和经典模式间切换
  const renderOutlinePane = () => (
    <aside className="flex h-full w-full flex-col rounded border border-cyan-400/15 bg-black/40 lg:w-72">
      <div className="flex items-center justify-between border-b border-cyan-400/10 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
          <BookOpen className="h-3.5 w-3.5" />
          {t('chapter.threeCol.outline')}
        </div>
        <button
          onClick={() => setShowOutlinePane(false)}
          className="rounded p-1 text-white/40 transition hover:bg-white/5 hover:text-cyan-300"
          title={t('chapter.threeCol.collapseOutline')}
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="border-b border-cyan-400/10 px-3 py-1.5 text-[10px] tracking-widest text-white/30">
        {t('chapter.threeCol.outline.hint')}
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {outlineLoading ? (
          <div className="flex items-center justify-center py-8 text-cyan-300/60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : outlineNodes.length === 0 ? (
          <div className="py-8 text-center text-[11px] tracking-wide text-white/30">
            {t('chapter.threeCol.outline.empty')}
          </div>
        ) : (
          <ul className="space-y-1">
            {outlineNodes.map((node) => (
              <li
                key={node.index}
                onClick={() => handlePickOutlineNode(node)}
                className={`cursor-pointer rounded border p-2 transition ${
                  activeOutlineNodeId === node.index
                    ? 'border-cyan-300 bg-cyan-400/[0.08]'
                    : 'border-cyan-400/10 hover:border-cyan-300/40 hover:bg-cyan-400/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded border border-cyan-300/40 bg-cyan-300/10 font-mono text-[10px] text-cyan-300">
                    {String(node.no).padStart(2, '0')}
                  </span>
                  <span className="line-clamp-1 flex-1 text-[12px] text-white/85">
                    {node.title || '(未命名)'}
                  </span>
                </div>
                {node.summary && (
                  <div className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/40">
                    {node.summary}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );

  const renderEditorPane = () => (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="sf-panel-hud p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="sf-chip">CHAPTER</span>
            <span className="text-sm font-bold text-white">
              <BookOpen className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
              {t('chapter.chapterTitle')
                .replace('{n}', chapterNo)
                .replace('{title}', chapterTitle || t('chapter.placeholder'))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copy} className="sf-btn-ghost">
              <Copy className="h-3 w-3" /> {t('common.copy').toUpperCase()}
            </button>
            <SaveButton onClick={handleSave} label={t('chapter.saveLabel').replace('{n}', chapterNo)} />
          </div>
        </div>
        <EditableText
          value={result}
          onSave={async (newVal) => {
            setResult(newVal);
            await handleSave();
          }}
          rows={24}
          placeholder={t('chapter.placeholder')}
        />
      </div>
    </section>
  );

  const renderAIPane = () => (
    <aside className="flex h-full w-full flex-col lg:w-80">
      <div className="mb-1 flex items-center justify-end px-1 lg:hidden">
        <button
          onClick={() => setShowAIPane(false)}
          className="rounded p-1 text-white/40 transition hover:bg-white/5 hover:text-cyan-300"
          title={t('chapter.threeCol.collapseAI')}
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* UX-06:右栏 tab 切换 AI 助手 / @人物 / 设定 */}
      <div className="mb-1 flex items-center gap-1 border-b border-cyan-400/10 px-1">
        {[
          { key: 'ai', label: t('chapter.threeCol.assistant') },
          { key: 'character', label: t('chapter.sidePane.tab.character') },
          { key: 'setting', label: t('chapter.sidePane.tab.setting') }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRightTab(tab.key)}
            className={`-mb-px border-b-2 px-2 py-1.5 text-[10px] tracking-widest transition ${
              rightTab === tab.key
                ? 'border-cyan-300 text-cyan-300'
                : 'border-transparent text-white/40 hover:text-cyan-300/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {rightTab === 'ai' && (
          <InlineAIAssistant
            sessionId={sessionId}
            skillId={skillId}
            onInsert={handleInsertAIText}
          />
        )}
        {rightTab === 'character' && (
          <CharacterPanel onInsert={handleInsertCharacterName} />
        )}
        {rightTab === 'setting' && <SettingPanel />}
      </div>
    </aside>
  );

  return (
    <div className="min-h-full p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="sf-heading">{t('chapter.heading')}</div>
          <p className="mt-2 pl-4 text-[12px] tracking-wide text-cyan-300/50">
            {t('chapter.subheading')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] tracking-wider text-cyan-300/60 sm:gap-3 sm:text-xs">
          {/* 三栏 / 经典模式切换 */}
          <button
            onClick={() => setThreeCol((v) => !v)}
            className="flex items-center gap-1.5 rounded border border-cyan-400/30 bg-cyan-400/[0.04] px-2 py-1 text-[10px] tracking-widest text-cyan-300/80 transition hover:bg-cyan-400/10"
            title={threeCol ? t('chapter.threeCol.toggleClassic') : t('chapter.threeCol.toggleThree')}
          >
            {threeCol ? <AlignJustify className="h-3 w-3" /> : <Columns2 className="h-3 w-3" />}
            {threeCol ? t('chapter.threeCol.toggleClassic') : t('chapter.threeCol.toggleThree')}
          </button>
          {threeCol && (
            <>
              <button
                onClick={() => setShowOutlinePane((v) => !v)}
                className="flex items-center gap-1 rounded border border-cyan-400/20 px-2 py-1 text-[10px] tracking-widest text-cyan-300/60 transition hover:bg-cyan-400/10"
                title={showOutlinePane ? t('chapter.threeCol.collapseOutline') : t('chapter.threeCol.expandOutline')}
              >
                {showOutlinePane ? <PanelLeftClose className="h-3 w-3" /> : <PanelLeftOpen className="h-3 w-3" />}
              </button>
              <button
                onClick={() => setShowAIPane((v) => !v)}
                className="flex items-center gap-1 rounded border border-cyan-400/20 px-2 py-1 text-[10px] tracking-widest text-cyan-300/60 transition hover:bg-cyan-400/10"
                title={showAIPane ? t('chapter.threeCol.collapseAI') : t('chapter.threeCol.expandAI')}
              >
                {showAIPane ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
              </button>
            </>
          )}
          <span className="sf-dot" />
          <span>{t('chapter.targetWords')}: {String(wordCount).padStart(4, '0')}</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl">
        {/* UX-05 草稿恢复提示:仅在有未保存草稿且非预填场景显示 */}
        {showRestoreBanner && (
          <DraftRestoreBanner
            draft={pendingDraft}
            hint={draftHint}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}
        <div className="sf-panel-hud mb-4 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[120px_200px_1fr]">
            <div>
              <label className="mb-1 block text-[10px] tracking-widest text-cyan-300/60">{t('chapter.chapterNo')}</label>
              <input
                type="number"
                min={1}
                value={chapterNo}
                onChange={(e) => setChapterNo(e.target.value)}
                className="sf-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] tracking-widest text-cyan-300/60">{t('chapter.session')}</label>
              <input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder={t('chapter.session')}
                className="sf-input w-full"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="mb-1 flex items-center justify-between text-[10px] tracking-widest text-cyan-300/60">
                <span>{t('chapter.targetWords')}</span>
                <span className="text-cyan-300">{wordCount}</span>
              </div>
              <div className="flex items-center gap-3 rounded border border-cyan-400/15 bg-black/40 px-3 py-2">
                <input
                  type="range"
                  min={500}
                  max={5000}
                  step={100}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
                <input
                  type="number"
                  min={500}
                  max={5000}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-16 rounded border border-cyan-400/15 bg-black/60 px-2 py-1 text-xs text-cyan-300 font-mono sm:w-20"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div>
              <label className="mb-1 block text-[10px] tracking-widest text-cyan-300/60">{t('chapter.title')}</label>
              <input
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder={t('chapter.titlePlaceholder')}
                className="sf-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] tracking-widest text-cyan-300/60">{t('chapter.skill')}</label>
              <select
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                className="sf-input h-[42px] w-full sm:w-[180px]"
              >
                <option value="">{t('chapter.skillAuto')}</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={loadNextFromOutline} className="sf-btn-ghost h-[42px] w-full sm:w-auto">
                <BookOpen className="h-3 w-3" /> {t('chapter.loadFromOutline')}
              </button>
            </div>
          </div>

          {previewedSkill && !skillId && (
            <div className="mt-2 flex items-center gap-2 border-t border-cyan-400/10 pt-2 font-mono text-[10px] tracking-widest text-cyan-300/60">
              <span className="sf-dot" />
              {t('chapter.autoMatch')}{' '}
              <span className="text-cyan-300">{previewedSkill.name}</span>
              <span className="text-white/30">{previewedSkill.description}</span>
            </div>
          )}
        </div>

        <div className="sf-panel-hud mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="sf-chip">{t('chapter.outline')}</span>
            <span className="font-mono text-[10px] tracking-widest text-white/30">
              {t('chapter.outlineChars').replace('{n}', String(outlineText.length))}
            </span>
          </div>
          {showPrefillBanner && (
            <div className="mb-2 flex items-center gap-2 rounded border border-cyan-400/20 bg-cyan-400/[0.04] px-2 py-1.5 text-[10px] tracking-widest text-cyan-300/70">
              <Info className="h-3 w-3" />
              {t('outline.prefilledFromOutline')}
            </div>
          )}
          <textarea
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            rows={6}
            placeholder={t('chapter.outlinePlaceholder')}
            className="sf-input w-full resize-none"
          />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-t border-cyan-400/10 pt-3">
          <div className="flex items-center gap-2 text-[11px] tracking-wide text-cyan-300/60">
            <span className="sf-dot" />
            {t('chapter.outlineChars').replace('{n}', String(outlineText.length))}
            {/* UX-05 自动保存状态指示 */}
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-widest text-cyan-300/40">
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
              {(autoSave.status === 'saved') && (
                <>
                  <Check className="h-3 w-3 text-emerald-300/70" />
                  <span className="text-emerald-300/70">{t('draft.autoSaved')}</span>
                </>
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openHistory} className="sf-btn-ghost">
              <History className="h-3 w-3" /> {t('chapter.history')}
            </button>
            <button
              onClick={handleOpenHistoryPanel}
              className="sf-btn-ghost"
              title={t('chapter.history.button')}
            >
              <History className="h-3 w-3" /> {t('chapter.history.button')}
            </button>
            <button
              onClick={() => setReviewOpen(true)}
              className="sf-btn-ghost"
              title={t('chapter.reviewTitle')}
            >
              <Shield className="h-3 w-3" /> {t('chapter.review')}
            </button>
            {(outlineText || result) && !loading && (
              <button onClick={reset} className="sf-btn-ghost">
                <Trash2 className="h-3 w-3" /> {t('common.reset')}
              </button>
            )}
            <button onClick={generate} disabled={loading} className="sf-btn">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? t('chapter.generating') : t('chapter.generate')}
            </button>
          </div>
        </div>
        {loading && <div className="sf-loader-bar mb-6" />}

        {threeCol ? (
          // 三栏布局:左大纲节点 + 中正文 + 右 AI 助手
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            {showOutlinePane && renderOutlinePane()}
            {hasContent ? (
              renderEditorPane()
            ) : (
              <div className="flex min-w-0 flex-1 items-center justify-center rounded border border-dashed border-cyan-400/10 bg-black/40 py-20 text-center text-white/30">
                <div>
                  <FileText className="mx-auto mb-3 h-12 w-12 opacity-40" />
                  <div className="text-xs tracking-wide text-white/40">{t('chapter.willRender')}</div>
                  <div className="mt-1 text-[10px] text-white/30">{t('chapter.willRenderHint')}</div>
                </div>
              </div>
            )}
            {showAIPane && renderAIPane()}
          </div>
        ) : (
          // 经典单栏布局
          hasContent ? (
            <div className="sf-panel-hud p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="sf-chip">CHAPTER</span>
                  <span className="text-sm font-bold text-white">
                    <BookOpen className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
                    {t('chapter.chapterTitle')
                      .replace('{n}', chapterNo)
                      .replace('{title}', chapterTitle || t('chapter.placeholder'))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copy} className="sf-btn-ghost">
                    <Copy className="h-3 w-3" /> {t('common.copy').toUpperCase()}
                  </button>
                  <SaveButton onClick={handleSave} label={t('chapter.saveLabel').replace('{n}', chapterNo)} />
                </div>
              </div>
              <EditableText
                value={result}
                onSave={async (newVal) => {
                  setResult(newVal);
                  await handleSave();
                }}
                rows={24}
                placeholder={t('chapter.placeholder')}
              />
            </div>
          ) : (
            !loading && (
              <div className="sf-panel rounded border border-dashed border-cyan-400/10 py-20 text-center text-white/30">
                <FileText className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <div className="text-xs tracking-wide text-white/40">{t('chapter.willRender')}</div>
                <div className="mt-1 text-[10px] text-white/30">{t('chapter.willRenderHint')}</div>
              </div>
            )
          )
        )}
      </div>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t('chapter.historyTitle')}
        items={historyItems}
        loading={historyLoading}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
      />

      {reviewOpen && (
        <ReviewSidebar chapterNo={Number(chapterNo) || 1} onClose={() => setReviewOpen(false)} />
      )}

      <ConflictResolver
        open={conflictOpen}
        chapterId={conflictChapterId}
        localContent={result}
        onUseServer={handleConflictUseServer}
        onForceLocal={handleConflictForceLocal}
        onClose={() => setConflictOpen(false)}
      />

      <ChapterHistoryPanel
        open={historyPanelOpen}
        chapterId={historyPanelChapterId}
        onRestore={handleRestoreHistory}
        onClose={() => setHistoryPanelOpen(false)}
      />
    </div>
  );
}
