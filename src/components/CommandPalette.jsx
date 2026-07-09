import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Plus,
  ListTree,
  PenLine,
  UserCircle2,
  Compass,
  MessageSquare,
  Globe,
  Moon,
  Sun,
  RefreshCw,
  Home,
  CornerDownLeft,
  Layers,
  Sparkles
} from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { listNovels } from '../api/index.js';

/**
 * 命令面板上下文(UX-09)。
 *
 * <p>全局 Cmd+K / Ctrl+K 唤起,提供:</p>
 * <ul>
 *   <li>快捷跳转:去小说列表 / 新建小说 / 各模块(在 NovelContext 下)</li>
 *   <li>切换语言 / 切换主题 / 刷新</li>
 *   <li>模糊搜索当前用户的小说并跳转 overview</li>
 * </ul>
 *
 * <p>设计原则:不阻塞路由,只在已登录后渲染。组件树外层挂 <CommandPalette /> 即可。</p>
 *
 * @author songshan.li (ID: 17099618)
 */
const CommandPaletteContext = createContext(null);

export function CommandPaletteProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [novels, setNovels] = useState([]);
  const [novelsLoading, setNovelsLoading] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);
  const togglePalette = useCallback(() => setOpen((v) => !v), []);

  // 全局快捷键:Cmd+K / Ctrl+K;Esc 关闭
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // 打开时懒加载小说列表(缓存,避免每次打开都拉)
  const ensureNovels = useCallback(async () => {
    if (novels.length > 0 || novelsLoading) return;
    setNovelsLoading(true);
    try {
      const list = await listNovels();
      setNovels(list || []);
    } catch {
      // 静默失败:命令面板不应阻塞主流程
    } finally {
      setNovelsLoading(false);
    }
  }, [novels.length, novelsLoading]);

  useEffect(() => {
    if (open) ensureNovels();
  }, [open, ensureNovels]);

  const value = useMemo(
    () => ({
      open,
      query,
      novels,
      novelsLoading,
      setQuery,
      openPalette,
      closePalette,
      togglePalette
    }),
    [open, query, novels, novelsLoading, setQuery, openPalette, closePalette, togglePalette]
  );

  return (
    <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette 必须在 CommandPaletteProvider 内使用');
  return ctx;
}

/**
 * 模糊匹配:对 title / author 做大小写不敏感的 includes 检查。
 */
function fuzzyMatch(text, q) {
  if (!q) return true;
  if (!text) return false;
  return text.toLowerCase().includes(q.toLowerCase());
}

/**
 * 命令面板浮层。
 *
 * <p>仅在已登录后挂载(由 MainLayout 决定)。包含搜索框 + 分组命令列表 +
 * 小说搜索结果,Enter 跳转当前高亮项。</p>
 */
export function CommandPalette() {
  const { t, lang, setLang } = useI18n();
  const { cycle: cycleTheme } = useTheme();
  const navigate = useNavigate();
  const { open, query, novels, closePalette } = useCommandPalette();
  const [activeIdx, setActiveIdx] = useState(0);

  // 静态命令:跳转 + 切换
  const commands = useMemo(() => {
    const list = [
      {
        id: 'goto-novels',
        icon: Home,
        label: t('cmd.goto.novels'),
        group: 'goto',
        action: () => navigate('/novels')
      },
      {
        id: 'create-novel',
        icon: Plus,
        label: t('cmd.create.novel'),
        group: 'goto',
        action: () => navigate('/novels/new')
      },
      {
        id: 'goto-chat',
        icon: MessageSquare,
        label: t('cmd.goto.chat'),
        group: 'goto',
        action: () => navigate('/chat')
      },
      {
        id: 'toggle-lang',
        icon: Globe,
        label: lang === 'zh' ? t('cmd.toggle.lang.toEn') : t('cmd.toggle.lang.toZh'),
        group: 'action',
        action: () => setLang(lang === 'zh' ? 'en' : 'zh')
      },
      {
        id: 'cycle-theme',
        icon: Sparkles,
        label: t('cmd.toggle.theme'),
        group: 'action',
        action: () => cycleTheme()
      },
      {
        id: 'refresh',
        icon: RefreshCw,
        label: t('cmd.refresh'),
        group: 'action',
        action: () => window.location.reload()
      }
    ];
    return list;
  }, [t, lang, setLang, cycleTheme, navigate]);

  // 过滤命令 + 过滤小说
  const filteredCommands = useMemo(
    () => commands.filter((c) => fuzzyMatch(c.label, query)),
    [commands, query]
  );

  const filteredNovels = useMemo(() => {
    const list = (novels || []).filter(
      (n) => fuzzyMatch(n.title, query) || fuzzyMatch(n.author, query)
    );
    return list.slice(0, 6);
  }, [novels, query]);

  // 扁平化高亮项(命令在前,小说在后)
  const flatItems = useMemo(() => {
    const cmdItems = filteredCommands.map((c) => ({ kind: 'cmd', value: c }));
    const novelItems = filteredNovels.map((n) => ({ kind: 'novel', value: n }));
    return [...cmdItems, ...novelItems];
  }, [filteredCommands, filteredNovels]);

  // 重置高亮到第一项
  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  // 上下方向键 + Enter
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIdx];
      if (item) {
        if (item.kind === 'cmd') {
          item.value.action();
        } else {
          navigate(`/novels/${item.value.id}/overview`);
        }
        closePalette();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm"
      onClick={closePalette}
    >
      <div
        className="mt-[12vh] w-[560px] max-w-[92vw] overflow-hidden rounded border border-cyan-400/30 bg-black/90 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索框 */}
        <div className="flex items-center gap-2 border-b border-cyan-400/15 px-3 py-3">
          <Search className="h-4 w-4 text-cyan-300/60" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('cmd.placeholder')}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <kbd className="rounded border border-white/20 px-1.5 py-0.5 text-[9px] tracking-wide text-white/40">
            ESC
          </kbd>
        </div>

        {/* 结果区 */}
        <div className="max-h-[50vh] overflow-y-auto px-2 py-2">
          {flatItems.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-white/30">
              {t('cmd.noResults')}
            </div>
          ) : (
            <>
              {filteredCommands.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-[10px] tracking-widest text-cyan-300/40">
                    {t('cmd.group.goto')}
                  </div>
                  {filteredCommands.map((c, i) => {
                    const Icon = c.icon;
                    const flatIdx = i;
                    return (
                      <button
                        key={c.id}
                        onMouseEnter={() => setActiveIdx(flatIdx)}
                        onClick={() => {
                          c.action();
                          closePalette();
                        }}
                        className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[12px] transition ${
                          activeIdx === flatIdx
                            ? 'bg-cyan-400/10 text-cyan-300'
                            : 'text-white/70 hover:bg-white/[0.03]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1">{c.label}</span>
                        {activeIdx === flatIdx && (
                          <CornerDownLeft className="h-3 w-3 text-cyan-300/40" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredNovels.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] tracking-widest text-cyan-300/40">
                    {t('cmd.group.novels')}
                  </div>
                  {filteredNovels.map((n, i) => {
                    const flatIdx = filteredCommands.length + i;
                    return (
                      <button
                        key={n.id}
                        onMouseEnter={() => setActiveIdx(flatIdx)}
                        onClick={() => {
                          navigate(`/novels/${n.id}/overview`);
                          closePalette();
                        }}
                        className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-[12px] transition ${
                          activeIdx === flatIdx
                            ? 'bg-cyan-400/10 text-cyan-300'
                            : 'text-white/70 hover:bg-white/[0.03]'
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{n.title || '(未命名)'}</div>
                          <div className="truncate text-[10px] text-white/30">
                            {n.author || '—'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between border-t border-cyan-400/10 px-3 py-1.5 text-[10px] tracking-wide text-white/30">
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-white/15 px-1 py-0.5">↑↓</kbd>
            <span>{t('cmd.hint.navigate')}</span>
            <kbd className="ml-2 rounded border border-white/15 px-1 py-0.5">↵</kbd>
            <span>{t('cmd.hint.select')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Compass className="h-3 w-3" />
            <span>{t('common.appName')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
