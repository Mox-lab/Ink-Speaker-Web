import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, Network, Grid3x3, History, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  extractCharacter,
  listCharacters,
  saveCharactersBatch,
  deleteCharacter
} from '../api/index.js';
import SaveButton from '../components/SaveButton.jsx';
import HistoryDrawer from '../components/HistoryDrawer.jsx';
import DraftRestoreBanner from '../components/DraftRestoreBanner.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { useTask } from '../context/TaskContext.jsx';
import { STORAGE_KEYS, draftKey } from '../constants/storage.js';
import { loadDraft, clearDraft } from '../utils/storage.js';
import { useAutoSave } from '../hooks/useAutoSave.js';
import { parseEdges, circularLayout } from '../utils/layout.js';
import { useNovelId } from '../hooks/useNovelId.js';

/* ============ 关系图 ============ */
function RelationGraph({ characters, t }) {
  const W = 760;
  const H = 520;

  const { positioned, edges } = useMemo(() => {
    if (characters.length === 0) return { positioned: [], edges: [] };
    const names = characters.map((c) => c.name).filter(Boolean);
    const positioned = circularLayout(
      characters.map((c) => ({ ...c })),
      W,
      H
    );
    const edgeList = [];
    const seen = new Set();
    for (const c of characters) {
      if (!c.name) continue;
      const parsed = parseEdges(c, names);
      for (const e of parsed) {
        const key = [e.from, e.to].sort().join('→');
        if (seen.has(key)) continue;
        seen.add(key);
        edgeList.push(e);
      }
    }
    return { positioned, edges: edgeList };
  }, [characters]);

  if (positioned.length === 0) {
    return (
      <div className="flex h-[520px] items-center justify-center text-white/20">
        <div className="text-center">
          <Network className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <div className="text-xs tracking-wide text-white/40">{t('character.graphEmpty')}</div>
        </div>
      </div>
    );
  }

  const posMap = new Map(positioned.map((p) => [p.name, p]));
  const palette = ['#38e6ff', '#a06cff', '#4dffb8', '#ffc857', '#ff6ce0', '#5cf2ff'];

  return (
    <div className="sf-scroll-x relative w-full overflow-x-auto rounded border border-cyan-400/15 bg-black/40">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block min-w-[600px] w-full sm:min-w-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(56,230,255,0.04), transparent 70%)'
        }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56,230,255,0.05)" strokeWidth="1" />
          </pattern>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(56,230,255,0.5)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {[100, 160, 220].map((r) => (
          <circle
            key={r}
            cx={W / 2}
            cy={H / 2}
            r={r}
            fill="none"
            stroke="rgba(56,230,255,0.06)"
            strokeDasharray="2 4"
          />
        ))}

        {edges.map((e, i) => {
          const a = posMap.get(e.from);
          const b = posMap.get(e.to);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nx = -dy / dist;
          const ny = dx / dist;
          const curve = 20;
          const path = `M ${a.x} ${a.y} Q ${mx + nx * curve} ${my + ny * curve} ${b.x} ${b.y}`;
          return (
            <g key={i}>
              <path d={path} fill="none" stroke="rgba(56,230,255,0.4)" strokeWidth="1.2" />
              <text
                x={mx + nx * curve}
                y={my + ny * curve}
                fill="rgba(56,230,255,0.7)"
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: 'monospace' }}
              >
                {e.type}
              </text>
            </g>
          );
        })}

        {positioned.map((p, i) => {
          const color = palette[i % palette.length];
          return (
            <g key={i} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r={32} fill="url(#nodeGlow)" opacity={0.6} />
              <circle
                cx={p.x}
                cy={p.y}
                r={20}
                fill="rgba(8,16,30,0.95)"
                stroke={color}
                strokeWidth="1.5"
              />
              <text
                x={p.x}
                y={p.y}
                fill={color}
                fontSize="14"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
              >
                {p.name?.charAt(0) || '?'}
              </text>
              <text
                x={p.x}
                y={p.y + 36}
                fill="#fff"
                fontSize="12"
                textAnchor="middle"
                style={{ fontFamily: 'sans-serif', fontWeight: 'bold' }}
              >
                {p.name}
              </text>
              {p.role && (
                <text
                  x={p.x}
                  y={p.y + 50}
                  fill="rgba(255,255,255,0.4)"
                  fontSize="10"
                  textAnchor="middle"
                  style={{ fontFamily: 'monospace' }}
                >
                  {p.role}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-between border-t border-cyan-400/10 bg-black/40 px-4 py-2 font-mono text-[10px] tracking-widest text-cyan-300/60">
        <span className="flex items-center gap-2">
          <span className="sf-dot" />
          GRAPH · ACTIVE
        </span>
        <span>NODES: {positioned.length}</span>
        <span>EDGES: {edges.length}</span>
      </div>
    </div>
  );
}

/* ============ 可编辑角色卡片 ============ */
const FIELD_DEFS = [
  { key: 'name', label: 'NAME', type: 'input' },
  { key: 'role', label: 'ROLE', type: 'input' },
  { key: 'age', label: 'AGE', type: 'input' },
  { key: 'gender', label: 'GENDER', type: 'input' },
  { key: 'identity', label: 'IDENTITY', type: 'input' },
  { key: 'personality', label: 'TRAIT', type: 'textarea' },
  { key: 'appearance', label: 'APPEAR', type: 'textarea' },
  { key: 'weapon', label: 'WEAPON', type: 'input' },
  { key: 'background', label: 'BG', type: 'textarea' },
  { key: 'goal', label: 'GOAL', type: 'textarea' },
  { key: 'skills', label: 'SKILL', type: 'input' },
  { key: 'relationships', label: 'REL', type: 'textarea' }
];

function CharacterCard({ character, index, onChange, onRemove }) {
  const palette = ['cyan', 'purple', 'emerald', 'amber', 'rose'];
  const accent = palette[index % palette.length];
  const colorMap = {
    cyan: 'border-cyan-300/40 text-cyan-300 bg-cyan-300/10',
    purple: 'border-purple-300/40 text-purple-300 bg-purple-300/10',
    emerald: 'border-emerald-300/40 text-emerald-300 bg-emerald-300/10',
    amber: 'border-amber-300/40 text-amber-300 bg-amber-300/10',
    rose: 'border-rose-300/40 text-rose-300 bg-rose-300/10'
  };

  const setField = (key, val) => {
    onChange({ ...character, [key]: val });
  };

  return (
    <div className="sf-scan relative flex flex-col rounded border border-cyan-400/15 bg-black/40 p-5 transition hover:border-cyan-300/40">
      <div className="mb-3 flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded border ${colorMap[accent]} font-mono text-base font-bold`}
        >
          {character.name?.charAt(0) || '?'}
        </div>
        <button
          onClick={onRemove}
          className="font-mono text-[10px] tracking-widest text-rose-300/50 hover:text-rose-300"
        >
          REMOVE
        </button>
      </div>

      <div className="space-y-1.5 text-xs leading-relaxed">
        {FIELD_DEFS.map((f) => (
          <div key={f.key} className="flex gap-2">
            <span className="w-14 shrink-0 font-mono text-[10px] tracking-widest text-cyan-300/60">
              {f.label}
            </span>
            {f.type === 'textarea' ? (
              <textarea
                value={character[f.key] ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
                rows={2}
                className="sf-input flex-1 resize-none !text-xs !py-1"
              />
            ) : (
              <input
                value={character[f.key] ?? ''}
                onChange={(e) => setField(f.key, e.target.value)}
                className="sf-input flex-1 !text-xs !py-1"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 主页面 ============ */
export default function Character() {
  const { t } = useI18n();
  const novelId = useNovelId();
  const { runTask } = useTask();
  const STORAGE_KEY = draftKey(STORAGE_KEYS.DRAFT_CHARACTER, novelId);
  const persisted = useMemo(() => loadDraft(STORAGE_KEY), [STORAGE_KEY]);
  const [text, setText] = useState(persisted?.text || '');
  const [characters, setCharacters] = useState(persisted?.characters || []);
  const [raw, setRaw] = useState(persisted?.raw || null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('grid');

  // 历史
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  // UX-05:人物草稿对象
  const draftState = useMemo(
    () => ({ text, characters, raw, savedAt: Date.now() }),
    [text, characters, raw]
  );
  const autoSave = useAutoSave(draftState, STORAGE_KEY, { interval: 5000, enabled: !loading });

  // 草稿恢复
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);

  useEffect(() => {
    if (!persisted) return;
    if (persisted.text || (Array.isArray(persisted.characters) && persisted.characters.length > 0)) {
      setPendingDraft(persisted);
      setShowRestoreBanner(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreDraft = (draft) => {
    if (!draft) return;
    if (typeof draft.text === 'string') setText(draft.text);
    if (Array.isArray(draft.characters)) setCharacters(draft.characters);
    if (draft.raw !== undefined) setRaw(draft.raw);
    setShowRestoreBanner(false);
    setPendingDraft(null);
    toast.success(t('draft.restore'));
  };

  const handleDiscardDraft = () => {
    clearDraft(STORAGE_KEY);
    setText('');
    setCharacters([]);
    setRaw(null);
    setShowRestoreBanner(false);
    setPendingDraft(null);
    toast.success(t('draft.discard'));
  };

  const draftHint = useMemo(() => {
    if (!pendingDraft?.savedAt) return '';
    const mins = Math.max(0, Math.round((Date.now() - pendingDraft.savedAt) / 60000));
    return t('draft.hintMinutes').replace('{n}', String(mins));
  }, [pendingDraft, t]);

  const extract = async () => {
    if (!text.trim()) {
      toast.error(t('character.textRequired'));
      return;
    }
    setLoading(true);
    setCharacters([]);
    setRaw(null);
    // UX-07:注册到任务面板
    runTask({
      type: 'character_extract',
      title: `${t('task.type.character')} · ${text.slice(0, 20)}...`,
      params: { text: text.trim() },
      run: () => extractCharacter(text.trim()),
      onSuccess: (data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.characters)
          ? data.characters
          : Array.isArray(data.data)
          ? data.data
          : [];
        setCharacters(list);
        setRaw(data);
        toast.success(t('character.extracted').replace('{n}', list.length));
      },
      successMsg: null
    });
    setLoading(false);
  };

  const reset = () => {
    setText('');
    setCharacters([]);
    setRaw(null);
    clearDraft(STORAGE_KEY);
    autoSave.clear();
    toast.success(t('character.reset'));
  };

  const updateChar = (idx, next) => {
    setCharacters((prev) => prev.map((c, i) => (i === idx ? next : c)));
  };

  const removeChar = (idx) => {
    setCharacters((prev) => prev.filter((_, i) => i !== idx));
  };

  const addBlank = () => {
    setCharacters((prev) => [
      ...prev,
      { name: '新角色', role: '', age: '', gender: '', personality: '', background: '' }
    ]);
  };

  /** 保存到数据库(批量 upsert) */
  const handleSave = async () => {
    if (characters.length === 0) throw new Error(t('character.charEmpty'));
    // 标准化字段:把字符串 relationships 转数组
    const payload = characters.map((c) => {
      const next = { ...c };
      if (typeof next.relationships === 'string' && next.relationships.trim()) {
        next.relationships = next.relationships
          .split(/[,，;；\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return next;
    });
    const data = await saveCharactersBatch(payload);
    // 后端保存成功 → 清掉本页草稿
    autoSave.clear();
    return data;
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const list = await listCharacters();
      setHistoryItems(
        (list || []).map((c) => ({
          id: c.id,
          title: c.name || '(未命名)',
          desc: c.personality || c.identity || c.background || '',
          meta: `${c.gender || '?'} · ${c.age || '?'}岁`.trim(),
          raw: c
        }))
      );
    } catch (err) {
      toast.error(t('character.loadHistoryFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectHistory = (item) => {
    setCharacters((prev) => {
      // 如果已经在列表里(同名)就跳过
      if (prev.some((c) => c.name === item.title)) return prev;
      return [...prev, item.raw];
    });
    setHistoryOpen(false);
    toast.success(t('character.loaded').replace('{name}', item.title));
  };

  const handleDeleteHistory = async (item) => {
    try {
      await deleteCharacter(item.id);
      setHistoryItems((prev) => prev.filter((x) => x.id !== item.id));
      toast.success(t('common.delete') + ' ✓');
    } catch (err) {
      toast.error(t('character.deleteFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  const hasCharacters = characters.length > 0;

  return (
    <div className="min-h-full p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="sf-heading">{t('character.heading')}</div>
          <p className="mt-2 pl-4 text-[12px] tracking-wide text-cyan-300/50">
            {t('character.subheading')}
          </p>
        </div>
        {hasCharacters && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('graph')}
              className={`sf-btn-ghost ${view === 'graph' ? '!border-cyan-300 !text-cyan-300 !bg-cyan-300/10' : ''}`}
            >
              <Network className="h-3.5 w-3.5" /> {t('character.graph')}
            </button>
            <button
              onClick={() => setView('grid')}
              className={`sf-btn-ghost ${view === 'grid' ? '!border-cyan-300 !text-cyan-300 !bg-cyan-300/10' : ''}`}
            >
              <Grid3x3 className="h-3.5 w-3.5" /> {t('character.cards')}
            </button>
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
          <label className="mb-2 block text-[10px] tracking-widest text-cyan-300/60">{t('character.sourceText')}</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={t('character.sourcePlaceholder')}
            className="sf-input w-full resize-none"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] tracking-widest text-white/30">
            <span>{t('character.charCount').replace('{n}', String(text.length))}</span>
            <span>{t('character.charHint')}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cyan-400/10 pt-3">
            <div className="flex items-center gap-2 text-[11px] tracking-wide text-cyan-300/60">
              <span className="sf-dot" />
              {t('character.ready')}
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
                {autoSave.status === 'saved' && (
                  <>
                    <Check className="h-3 w-3 text-emerald-300/70" />
                    <span className="text-emerald-300/70">{t('draft.autoSaved')}</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={openHistory} className="sf-btn-ghost">
                <History className="h-3 w-3" /> {t('character.history')}
              </button>
              {hasCharacters && <SaveButton onClick={handleSave} label={t('character.saveAll')} />}
              {(text || hasCharacters) && !loading && (
                <button onClick={reset} className="sf-btn-ghost">
                  <Trash2 className="h-3 w-3" /> {t('common.reset')}
                </button>
              )}
              <button onClick={extract} disabled={loading} className="sf-btn">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? t('character.extracting') : t('character.extract')}
              </button>
            </div>
          </div>
          {loading && <div className="sf-loader-bar mt-3" />}
        </div>

        {/* 结果区 */}
        {hasCharacters ? (
          <div>
            {view === 'graph' && (
              <div className="sf-panel-hud p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="sf-chip">GRAPH</span>
                  <span className="text-sm text-white/70">{t('character.graphTitle')}</span>
                </div>
                <RelationGraph characters={characters} t={t} />
              </div>
            )}

            {view === 'grid' && (
              <div className="sf-panel-hud p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="sf-chip">CARDS</span>
                    <span className="text-sm text-white/70">{t('character.cardsTitle').replace('{n}', characters.length)}</span>
                  </div>
                  <button onClick={addBlank} className="sf-btn-ghost">
                    + {t('character.addNew')}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {characters.map((c, i) => (
                    <CharacterCard
                      key={i}
                      character={c}
                      index={i}
                      onChange={(next) => updateChar(i, next)}
                      onRemove={() => removeChar(i)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          !loading &&
          raw === null && (
            <div className="sf-panel rounded border border-dashed border-cyan-400/10 py-20 text-center text-white/30">
              <Network className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <div className="text-xs tracking-wide text-white/40">{t('character.awaiting')}</div>
              <div className="mt-1 text-[10px] text-white/30">{t('character.awaitingHint')}</div>
            </div>
          )
        )}

        {!hasCharacters && raw !== null && (
          <div className="sf-panel-hud p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="sf-chip">RAW</span>
              <span className="text-sm text-white/70">{t('character.raw')}</span>
            </div>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/70">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t('character.historyTitle')}
        items={historyItems}
        loading={historyLoading}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
      />
    </div>
  );
}
