import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, Loader2, Globe, Lock, Sparkles, FileText, Compass, X, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { listNovels, deleteNovel } from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import NovelTemplatePicker from '../components/NovelTemplatePicker.jsx';

/** 最近点击排序的持久化 key。 */
const LAST_CLICK_KEY = 'novel.lastClickMap';

/**
 * 我的小说列表(登录后第一屏)。
 *
 * <ul>
 *   <li>卡片墙(grid)展示当前用户拥有的全部小说</li>
 *   <li>头部"创作"卡片:点击展开子菜单(从空白创建 / 从模板创建)</li>
 *   <li>点击小说卡片后按"最近点击时间"倒序排前(持久化到 localStorage)</li>
 *   <li>支持删除(二次确认 + 级联删除提示)</li>
 * </ul>
 *
 * @author songshan.li (ID: 17099618)
 */
export default function NovelList() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // 待删除的小说(非空时弹出确认框,替代原生 confirm)
  const [pendingDelete, setPendingDelete] = useState(null);
  // 最近点击排序表( id -> 时间戳)
  const [clickMap, setClickMap] = useState(() =>
    JSON.parse(localStorage.getItem(LAST_CLICK_KEY) || '{}')
  );
  // 防止 React StrictMode 开发模式下 useEffect 双重执行导致重复请求
  const fetchedRef = useRef(false);

  const fetchNovels = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listNovels();
      // 防御性检查:确保 novels 始终为数组,避免后端返回非数组时 .map 崩溃
      setNovels(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(t('novel.list.fetch.failed') + ':' + (err.message || ''));
      setNovels([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // StrictMode 双重挂载时,第二次跳过(仅开发环境生效)
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchNovels();
  }, [fetchNovels]);

  // 按最近点击时间倒序(点击越晚越靠前);未点击的保持在后面
  const sortedNovels = useMemo(
    () => [...novels].sort((a, b) => (clickMap[b.id] || 0) - (clickMap[a.id] || 0)),
    [novels, clickMap]
  );

  const handleOpen = (id) => {
    // 记录最近点击,刷新后仍保持排序
    setClickMap((prev) => {
      const next = { ...prev, [id]: Date.now() };
      localStorage.setItem(LAST_CLICK_KEY, JSON.stringify(next));
      return next;
    });
    navigate(`/novels/${id}/overview`);
  };

  const handleCreate = () => {
    setMenuOpen(false);
    navigate('/novels/new');
  };

  const handlePickTemplate = (tpl) => {
    setPickerOpen(false);
    setMenuOpen(false);
    navigate('/novels/new', { state: { template: tpl } });
  };

  const handleDeleteClick = (e, novel) => {
    e.stopPropagation();
    setPendingDelete(novel);
  };

  const confirmDelete = async (novel) => {
    setDeletingId(novel.id);
    try {
      await deleteNovel(novel.id);
      toast.success(
        t('novel.list.delete.success', '已删除').replace('{{title}}', novel.title)
      );
      setNovels((prev) => prev.filter((n) => n.id !== novel.id));
    } catch (err) {
      toast.error(err.message || t('common.deleteFailed'));
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  // ESC 关闭删除确认弹窗
  useEffect(() => {
    if (!pendingDelete) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setPendingDelete(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pendingDelete]);

  const formatTime = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* 头部 */}
      <header className="border-b border-cyan-400/10 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="sf-heading">{t('novel.list.title')}</div>
            <p className="mt-2 pl-4 text-[12px] tracking-wide text-cyan-300/50">
              {t('novel.list.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/novels/shared')}
              className="flex items-center gap-2 rounded border border-cyan-400/20 px-4 py-2 text-sm text-cyan-300/70 transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
              title={t('novel.shared.list.title')}
            >
              <Compass className="h-4 w-4" />
              {t('novel.shared.action.browse')}
            </button>
          </div>
        </div>
      </header>

      {/* 列表区 */}
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-8 sm:py-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-cyan-300/60">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('common.loading')}
          </div>
        ) : novels.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-8 text-white/40">
            {/* 欢迎引导 */}
            <div className="w-full max-w-3xl rounded border border-cyan-400/15 bg-black/40 p-6 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-cyan-300/60" />
              <div className="text-base tracking-wide text-cyan-300/80">
                {t('novel.onboard.welcome.title')}
              </div>
              <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-white/50">
                {t('novel.onboard.welcome.desc')}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                {[
                  { key: 'step1', icon: BookOpen },
                  { key: 'step2', icon: FileText },
                  { key: 'step3', icon: Sparkles }
                ].map(({ key, icon: Icon }) => (
                  <div
                    key={key}
                    className="rounded border border-cyan-400/10 bg-black/30 p-3"
                  >
                    <div className="mb-1 flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
                      <Icon className="h-3 w-3" />
                      {t(`novel.onboard.${key}.title`)}
                    </div>
                    <div className="text-[11px] leading-relaxed text-white/40">
                      {t(`novel.onboard.${key}.desc`)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 rounded border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
                >
                  <Plus className="h-4 w-4" />
                  {t('novel.onboard.cta.blank')}
                </button>
              </div>
            </div>

            {/* 模板库 */}
            <div className="w-full max-w-5xl">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <div className="text-sm tracking-wide text-cyan-300/70">
                    {t('novel.template.title')}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/30">
                    {t('novel.template.subtitle')}
                  </div>
                </div>
              </div>
              <NovelTemplatePicker onPick={handlePickTemplate} />
            </div>
          </div>
        ) : (
          <div className="novel-card-wall grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 创作卡片(头部入口) */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded border-2 border-dashed border-cyan-400/30 bg-cyan-400/[0.03] p-5 text-cyan-300/80 transition hover:border-cyan-300/60 hover:bg-cyan-400/[0.07]"
              >
                <Plus className="h-8 w-8" />
                <div className="text-base font-medium tracking-wide">
                  {t('novel.cardwall.create')}
                </div>
              </button>

              {/* 子菜单:空白创建 / 模板创建 */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded border border-cyan-400/20 bg-black/90 shadow-xl backdrop-blur-md">
                    <button
                      onClick={handleCreate}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-cyan-400/10"
                    >
                      <FileText className="h-4 w-4 text-cyan-300" />
                      {t('novel.cardwall.create.blank')}
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setPickerOpen(true);
                      }}
                      className="flex w-full items-center gap-2 border-t border-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-cyan-400/10"
                    >
                      <LayoutTemplate className="h-4 w-4 text-cyan-300" />
                      {t('novel.cardwall.create.template')}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 小说卡片 */}
            {sortedNovels.map((novel) => (
              <div
                key={novel.id}
                onClick={() => handleOpen(novel.id)}
                className="sf-scan group relative cursor-pointer rounded border border-cyan-400/15 bg-black/40 p-5 transition hover:border-cyan-300/50 hover:bg-cyan-400/[0.04]"
              >
                {/* 顶部标识 */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] tracking-widest text-cyan-300/40">
                    <BookOpen className="h-3 w-3" />
                    NOVEL
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${
                        novel.sharedForReference
                          ? 'bg-cyan-400/10 text-cyan-300'
                          : 'bg-white/5 text-white/40'
                      }`}
                    >
                      {novel.sharedForReference ? (
                        <>
                          <Globe className="h-3 w-3" />
                          {t('novel.list.card.shared')}
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          {t('novel.list.card.private')}
                        </>
                      )}
                    </span>
                    <button
                      onClick={(e) => handleDeleteClick(e, novel)}
                      disabled={deletingId === novel.id}
                      title={t('common.delete')}
                      className="rounded p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === novel.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 标题 */}
                <div
                  className="mb-1 text-lg font-bold leading-tight text-white"
                  style={{
                    fontFamily:
                      '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
                  }}
                >
                  {novel.title || '(未命名)'}
                </div>
                <div className="mb-3 text-[11px] tracking-wider text-cyan-300/40">
                  {novel.author || user?.username || '—'}
                </div>

                {/* 简介 */}
                <div className="mb-4 line-clamp-2 min-h-[2.4em] text-[12px] leading-relaxed text-white/60">
                  {novel.description || '—'}
                </div>

                {/* 时间 */}
                <div className="border-t border-cyan-400/10 pt-2 text-[10px] tracking-wider text-white/30">
                  <div>{t('novel.list.card.createdAt')}: {formatTime(novel.createdAt)}</div>
                  <div className="mt-0.5">
                    {t('novel.list.card.updatedAt')}: {formatTime(novel.updatedAt)}
                  </div>
                </div>

                {/* 进入提示 */}
                <div className="mt-3 flex items-center justify-end gap-1 text-[11px] tracking-widest text-cyan-300/60 opacity-0 transition group-hover:opacity-100">
                  {t('novel.list.card.open')}
                  <Plus className="h-3 w-3 rotate-45" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 模板选择弹层 */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8">
          <div className="relative w-full max-w-5xl rounded border border-cyan-400/20 bg-black/80 p-5">
            <button
              onClick={() => setPickerOpen(false)}
              className="absolute right-3 top-3 rounded border border-cyan-400/30 bg-black/70 p-2 text-cyan-300"
              aria-label={t('common.cancel')}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 text-sm tracking-wide text-cyan-300/80">
              {t('novel.template.title')}
            </div>
            <NovelTemplatePicker onPick={handlePickTemplate} />
          </div>
        </div>
      )}

      {/* 删除确认弹窗(主题化,替代原生 confirm,与页面玻璃面板风格一致) */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingDelete(null);
          }}
        >
          <div className="w-full max-w-sm rounded-lg border border-cyan-400/20 bg-black/80 p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm tracking-wide text-cyan-300/90">
              <Trash2 className="h-4 w-4 text-red-300" />
              {t('novel.overview.action.delete')}
            </div>
            <p className="mb-5 text-[13px] leading-relaxed text-white/70">
              {t('novel.list.delete.confirm', `确认删除小说《${pendingDelete.title}》?`).replace(
                '{{title}}',
                pendingDelete.title
              )}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded px-3 py-1.5 text-[12px] text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => confirmDelete(pendingDelete)}
                disabled={deletingId === pendingDelete.id}
                className="flex items-center gap-1.5 rounded bg-red-500/15 px-3 py-1.5 text-[12px] font-medium text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
              >
                {deletingId === pendingDelete.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
