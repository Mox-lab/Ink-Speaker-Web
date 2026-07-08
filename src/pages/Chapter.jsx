import { useEffect, useMemo, useState } from 'react';
import { Loader2, BookOpen, Copy, Sparkles, FileText, History, Trash2, Shield } from 'lucide-react';
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
import { useI18n } from '../context/I18nContext.jsx';
import { STORAGE_KEYS } from '../constants/storage.js';
import { loadDraft, saveDraft, clearDraft, appendLocal } from '../utils/storage.js';

const STORAGE_KEY = STORAGE_KEYS.DRAFT_CHAPTER;

export default function Chapter() {
  const { t } = useI18n();
  const persisted = useMemo(() => loadDraft(STORAGE_KEY), []);
  const [sessionId, setSessionId] = useState(persisted?.sessionId || 'chapter-001');
  const [outlineText, setOutlineText] = useState(persisted?.outlineText || '');
  const [wordCount, setWordCount] = useState(persisted?.wordCount ?? 2000);
  const [chapterNo, setChapterNo] = useState(persisted?.chapterNo ?? 1);
  const [chapterTitle, setChapterTitle] = useState(persisted?.chapterTitle || '');
  const [result, setResult] = useState(persisted?.result || '');
  const [loading, setLoading] = useState(false);

  // P1 新增:Skill 系统
  const [skills, setSkills] = useState([]);
  const [skillId, setSkillId] = useState('');           // '' 表示自动匹配
  const [previewedSkill, setPreviewedSkill] = useState(null);

  // P1 新增:审查侧栏
  const [reviewOpen, setReviewOpen] = useState(false);

  // 历史
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  // 加载 Skill 列表
  useEffect(() => {
    listSkills()
      .then((list) => setSkills(list || []))
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    if (outlineText || result) {
      saveDraft(STORAGE_KEY, {
        sessionId,
        outlineText,
        wordCount: Number(wordCount) || 2000,
        chapterNo: Number(chapterNo) || 1,
        chapterTitle,
        result
      });
    }
  }, [sessionId, outlineText, wordCount, chapterNo, chapterTitle, result]);

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

  const generate = async () => {
    if (!outlineText.trim()) {
      toast.error(t('chapter.outlineRequired'));
      return;
    }
    setLoading(true);
    setResult('');
    try {
      const data = await chapterWithSkill(
        sessionId.trim() || 'chapter-001',
        outlineText.trim(),
        skillId || undefined,
        Number(wordCount) || 2000
      );
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
      // 记录 token 用量(简易:用字符数估算)
      try {
        appendLocal(STORAGE_KEYS.TOKEN_LOG, {
          at: Date.now(),
          chars: (outlineText.length || 0) + (data.content?.length || 0)
        });
      } catch {}
    } catch (err) {
      toast.error(t('chapter.generateFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOutlineText('');
    setResult('');
    setChapterTitle('');
    clearDraft(STORAGE_KEY);
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
    return await saveChapter(payload);
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

  return (
    <div className="min-h-screen p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <div className="sf-heading">{t('chapter.heading')}</div>
          <p className="mt-2 pl-4 font-mono text-[11px] tracking-wider text-cyan-300/50">
            // CHAPTER · {t('chapter.subheading')}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-cyan-300/60">
          <span className="sf-dot" />
          <span>{t('chapter.targetWords')}: {String(wordCount).padStart(4, '0')}</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl">
        <div className="sf-panel-hud mb-4 p-4">
          <div className="grid grid-cols-[120px_200px_1fr] gap-3">
            <div>
              <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">// {t('chapter.chapterNo').toUpperCase()}</div>
              <input
                type="number"
                min={1}
                value={chapterNo}
                onChange={(e) => setChapterNo(e.target.value)}
                className="sf-input w-full"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">// {t('chapter.session').toUpperCase()}</div>
              <input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder={t('chapter.session')}
                className="sf-input w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] tracking-widest text-cyan-300/60">
                <span>// {t('outline.chapters').toUpperCase()}</span>
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
                  className="w-20 rounded border border-cyan-400/15 bg-black/60 px-2 py-1 text-xs text-cyan-300 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-3">
            <div>
              <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">// {t('chapter.title').toUpperCase()}</div>
              <input
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder={t('chapter.titlePlaceholder')}
                className="sf-input w-full"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">// {t('chapter.skill').toUpperCase()}</div>
              <select
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                className="sf-input h-[42px] w-[180px]"
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
              <button onClick={loadNextFromOutline} className="sf-btn-ghost h-[42px]">
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
            <span className="sf-chip">{t('chapter.outline').toUpperCase()}</span>
            <span className="font-mono text-[10px] tracking-widest text-white/30">
              CHARS: {outlineText.length}
            </span>
          </div>
          <textarea
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            rows={6}
            placeholder={t('chapter.outlinePlaceholder')}
            className="sf-input w-full resize-none"
          />
        </div>

        <div className="mb-6 flex items-center justify-between border-t border-cyan-400/10 pt-3">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-cyan-300/40">
            <span className="sf-dot" />
            READY
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openHistory} className="sf-btn-ghost">
              <History className="h-3 w-3" /> {t('chapter.history')}
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

        {hasContent ? (
          <div className="sf-panel-hud p-5">
            <div className="mb-3 flex items-center justify-between">
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
              <div className="font-mono text-xs tracking-widest">// {t('chapter.willRender').toUpperCase()}</div>
            </div>
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
    </div>
  );
}
