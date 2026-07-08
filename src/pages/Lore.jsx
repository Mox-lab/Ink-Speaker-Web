import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Compass, Upload, Search, BookMarked, Terminal, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  loreAsk,
  importLore,
  loreSearch,
  listSettings,
  saveSetting,
  deleteSetting
} from '../api/index.js';
import SaveButton from '../components/SaveButton.jsx';
import MemoryPanel from '../components/MemoryPanel.jsx';
import UsagePanel from '../components/UsagePanel.jsx';
import { useI18n } from '../context/I18nContext.jsx';

export default function Lore() {
  const { t } = useI18n();
  const isEn = t('common.langZh') === '中';
  const TABS = [
    { key: 'ask', label: t('lore.tabAsk'), icon: Compass },
    { key: 'import', label: t('lore.tabImport'), icon: Upload },
    { key: 'search', label: t('lore.tabSearch'), icon: Search },
    { key: 'archive', label: t('lore.tabArchive'), icon: Database },
    { key: 'memory', label: t('lore.tabMemory'), icon: BookMarked }
  ];

  const [tab, setTab] = useState('ask');
  const [sessionId, setSessionId] = useState('lore-001');
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const [loreTitle, setLoreTitle] = useState('');
  const [loreContent, setLoreContent] = useState('');
  const [importResult, setImportResult] = useState(null);

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // 档案管理
  const [archiveList, setArchiveList] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveDraft, setArchiveDraft] = useState({ keyword: '', category: '', description: '' });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, loading]);

  // 切到档案 tab 时自动加载一次
  useEffect(() => {
    if (tab === 'archive' && archiveList.length === 0 && !archiveLoading) {
      refreshArchive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const ask = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setHistory((h) => [...h, { role: 'user', text: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const a = await loreAsk(q, sessionId.trim() || 'lore-001');
      setHistory((h) => [...h, { role: 'assistant', text: a }]);
    } catch (err) {
      toast.error(t('lore.askFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const onAskKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const doImport = async () => {
    if (!loreTitle.trim() || !loreContent.trim()) {
      toast.error(t('lore.titleRequired'));
      return;
    }
    setLoading(true);
    try {
      const data = await importLore({ title: loreTitle.trim(), content: loreContent.trim() });
      setImportResult(data);
      toast.success(t('lore.imported'));
      setLoreTitle('');
      setLoreContent('');
    } catch (err) {
      toast.error(t('lore.importFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const doSearch = async () => {
    if (!query.trim()) {
      toast.error(t('lore.queryRequired'));
      return;
    }
    setLoading(true);
    try {
      const data = await loreSearch(query.trim());
      setSearchResult(data);
    } catch (err) {
      toast.error(t('lore.searchFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const refreshArchive = async () => {
    setArchiveLoading(true);
    try {
      const list = await listSettings();
      setArchiveList(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(t('lore.loadFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setArchiveLoading(false);
    }
  };

  const saveArchiveItem = async () => {
    if (!archiveDraft.keyword.trim()) {
      toast.error(t('lore.keywordRequired'));
      return;
    }
    try {
      await saveSetting({
        keyword: archiveDraft.keyword.trim(),
        category: archiveDraft.category.trim() || (isEn ? 'General' : '通用'),
        description: archiveDraft.description.trim()
      });
      toast.success(t('lore.archiveSaved'));
      setArchiveDraft({ keyword: '', category: '', description: '' });
      refreshArchive();
    } catch (err) {
      toast.error(t('lore.saveFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  const removeArchiveItem = async (id) => {
    try {
      await deleteSetting(id);
      setArchiveList((prev) => prev.filter((x) => x.id !== id));
      toast.success(t('common.delete') + ' ✓');
    } catch (err) {
      toast.error(t('common.deleteFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-cyan-400/10 px-8 py-5">
        <div className="sf-heading">{t('lore.heading')}</div>
        <p className="mt-2 pl-4 font-mono text-[11px] tracking-wider text-cyan-300/50">
          // LORE · {t('lore.subheading')}
        </p>
      </header>

      <div className="border-b border-cyan-400/10 px-8 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`flex items-center gap-2 rounded border px-4 py-2 text-xs tracking-wider transition ${
                  active
                    ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-300 shadow-[0_0_16px_rgba(56,230,255,0.15)]'
                    : 'border-cyan-400/15 bg-transparent text-white/50 hover:border-cyan-300/40 hover:text-cyan-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tb.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto max-w-4xl">
          {tab === 'ask' && (
            <div className="flex h-full flex-col">
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-[10px] tracking-widest text-cyan-300/60">{t('lore.session').toUpperCase()}</span>
                <input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="sf-input flex-1 max-w-[200px]"
                />
                <span className="text-[10px] tracking-wider text-white/30">{t('lore.sessionHint')}</span>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto pb-4">
                {history.length === 0 && !loading && (
                  <div className="flex h-full items-center justify-center text-white/20">
                    <div className="text-center">
                      <Compass className="mx-auto mb-3 h-12 w-12 opacity-40" />
                      <div className="font-mono text-xs tracking-widest">// {t('lore.awaiting')}</div>
                      <div className="mt-1 text-[10px] text-white/30">{t('lore.awaitingHint')}</div>
                    </div>
                  </div>
                )}
                {history.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded border px-4 py-3 ${
                        m.role === 'user'
                          ? 'border-cyan-300/40 bg-cyan-300/[0.08] text-white shadow-[0_0_16px_rgba(56,230,255,0.15)]'
                          : 'border-cyan-400/15 bg-black/40 text-white/90'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 font-mono text-[9px] tracking-widest text-cyan-300/50">
                        {m.role === 'user' ? (
                          <>
                            <Terminal className="h-2.5 w-2.5" /> {t('lore.user')}
                          </>
                        ) : (
                          <>
                            <span className="sf-dot" /> {t('lore.bot')}
                          </>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.text}</pre>
                    </div>
                  </div>
                ))}
                {loading && tab === 'ask' && (
                  <div className="flex justify-start">
                    <div className="rounded border border-cyan-400/15 bg-black/40 px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-300/60" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'import' && (
            <div className="space-y-4">
              <div className="sf-panel-hud p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="sf-chip">{t('lore.title').toUpperCase()}</span>
                </div>
                <input
                  value={loreTitle}
                  onChange={(e) => setLoreTitle(e.target.value)}
                  placeholder={t('lore.titlePlaceholder')}
                  className="sf-input w-full"
                />
              </div>
              <div className="sf-panel-hud p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="sf-chip">{t('lore.content').toUpperCase()}</span>
                  <span className="font-mono text-[10px] tracking-widest text-white/30">
                    CHARS: {loreContent.length}
                  </span>
                </div>
                <textarea
                  value={loreContent}
                  onChange={(e) => setLoreContent(e.target.value)}
                  rows={10}
                  placeholder={t('lore.contentPlaceholder')}
                  className="sf-input w-full resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-cyan-300/40">
                  <span className="sf-dot" />
                  READY
                </div>
                <button onClick={doImport} disabled={loading} className="sf-btn">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {loading ? t('lore.importing') : t('lore.import')}
                </button>
              </div>
              {loading && <div className="sf-loader-bar" />}
              {importResult && (
                <div className="sf-panel-hud p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="sf-chip">RESULT</span>
                    <span className="text-sm font-bold text-white">
                      <BookMarked className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />
                      {t('lore.importResult')}
                    </span>
                  </div>
                  <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/70">
                    {JSON.stringify(importResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {tab === 'archive' && (
            <div className="space-y-4">
              <div className="sf-panel-hud p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="sf-chip">NEW</span>
                  <span className="text-[10px] tracking-widest text-white/30">{t('lore.archiveHint')}</span>
                </div>
                <div className="grid grid-cols-[160px_140px_1fr_auto] gap-2">
                  <input
                    value={archiveDraft.keyword}
                    onChange={(e) => setArchiveDraft((s) => ({ ...s, keyword: e.target.value }))}
                    placeholder={t('lore.keywordPlaceholder')}
                    className="sf-input"
                  />
                  <input
                    value={archiveDraft.category}
                    onChange={(e) => setArchiveDraft((s) => ({ ...s, category: e.target.value }))}
                    placeholder={t('lore.categoryPlaceholder')}
                    className="sf-input"
                  />
                  <input
                    value={archiveDraft.description}
                    onChange={(e) => setArchiveDraft((s) => ({ ...s, description: e.target.value }))}
                    placeholder={t('lore.descPlaceholder')}
                    className="sf-input"
                  />
                  <SaveButton
                    onClick={saveArchiveItem}
                    label={t('common.save')}
                    variant="ghost"
                  />
                </div>
              </div>

              <div className="sf-panel-hud p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="sf-chip">LIST</span>
                    <span className="text-sm text-white/70">{t('lore.archiveList')}</span>
                  </div>
                  <button onClick={refreshArchive} className="sf-btn-ghost" disabled={archiveLoading}>
                    {archiveLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                    {t('common.refresh')}
                  </button>
                </div>
                {archiveLoading ? (
                  <div className="py-12 text-center text-white/30">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-300/60" />
                  </div>
                ) : archiveList.length === 0 ? (
                  <div className="rounded border border-dashed border-cyan-400/10 py-12 text-center text-white/30">
                    <Database className="mx-auto mb-2 h-10 w-10 opacity-40" />
                    <div className="font-mono text-[10px] tracking-widest">// {t('lore.archiveEmpty')}</div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {archiveList.map((s) => (
                      <li
                        key={s.id}
                        className="sf-scan rounded border border-cyan-400/15 bg-black/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="rounded border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-cyan-300">
                                {(s.category || 'GENERAL').toUpperCase()}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {s.keyword}
                              </span>
                            </div>
                            {s.description && (
                              <div className="whitespace-pre-wrap text-xs text-white/60">
                                {s.description}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeArchiveItem(s.id)}
                            className="font-mono text-[10px] tracking-widest text-rose-300/50 hover:text-rose-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'memory' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MemoryPanel />
                <UsagePanel />
              </div>
              <div className="sf-panel-hud p-4">
                <div className="mb-2 font-mono text-[10px] tracking-widest text-cyan-300/60">
                  // {t('lore.architectureTitle').toUpperCase()}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-white/60">
{t('lore.architecture')}
                </pre>
              </div>
            </div>
          )}

          {tab === 'search' && (
            <div className="space-y-4">
              <div className="sf-panel-hud p-4">
                <div className="mb-2 text-[10px] tracking-widest text-cyan-300/60">// {t('lore.query').toUpperCase()}</div>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                    placeholder={t('lore.queryPlaceholder')}
                    className="sf-input flex-1"
                  />
                  <button onClick={doSearch} disabled={loading} className="sf-btn">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t('lore.search')}
                  </button>
                </div>
              </div>
              {searchResult && (
                <div className="sf-panel-hud p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="sf-chip">HITS</span>
                    <span className="text-sm font-bold text-white">{t('lore.hits')}</span>
                  </div>
                  {Array.isArray(searchResult) ? (
                    <div className="space-y-3">
                      {searchResult.map((r, i) => (
                        <div
                          key={i}
                          className="sf-scan rounded border border-cyan-400/15 bg-black/40 p-3"
                        >
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-mono text-cyan-300">
                              #{String(i + 1).padStart(3, '0')} · {r.title || r.id || 'UNTITLED'}
                            </span>
                            {r.score && (
                              <span className="font-mono text-[10px] tracking-widest text-white/40">
                                SCORE: {Number(r.score).toFixed(4)}
                              </span>
                            )}
                          </div>
                          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-white/70">
                            {r.content || r.text || JSON.stringify(r)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/70">
                      {JSON.stringify(searchResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              {!searchResult && !loading && (
                <div className="sf-panel rounded border border-dashed border-cyan-400/10 py-20 text-center text-white/30">
                  <Search className="mx-auto mb-3 h-12 w-12 opacity-40" />
                  <div className="font-mono text-xs tracking-widest">// {t('lore.hitsAwaiting')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {tab === 'ask' && (
        <div className="border-t border-cyan-400/10 px-8 py-4">
          <div className="mx-auto flex max-w-4xl items-end gap-2">
            <div className="flex-1">
              <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">// {t('lore.question').toUpperCase()}</div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={onAskKeyDown}
                rows={2}
                placeholder={t('lore.questionPlaceholder')}
                className="sf-input w-full resize-none"
              />
            </div>
            <button
              onClick={ask}
              disabled={loading || !question.trim()}
              className="sf-btn h-[64px] px-4"
              title={t('common.send')}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          {loading && <div className="sf-loader-bar mx-auto mt-3 max-w-4xl" />}
        </div>
      )}
    </div>
  );
}
