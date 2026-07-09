import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, Loader2, RefreshCw, Globe, Lock, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { listNovels, deleteNovel } from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import NovelTemplatePicker from '../components/NovelTemplatePicker.jsx';
import RecentNovels, { pushRecentNovel } from '../components/RecentNovels.jsx';

/**
 * 我的小说列表(登录后第一屏)。
 *
 * <p>第 6 阶段(以小说为主体):</p>
 * <ul>
 *   <li>展示当前用户拥有的全部小说,按 updatedAt 倒序</li>
 *   <li>每个卡片显示标题/作者/简介/创建时间/最近更新</li>
 *   <li>"创建新小说"按钮 → /novels/new</li>
 *   <li>点卡片 → /novels/:novelId/overview 进入小说工作台</li>
 *   <li>支持删除(带二次确认 + 级联删除提示)</li>
 * </ul>
 */
export default function NovelList() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const fetchNovels = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listNovels();
      setNovels(list || []);
    } catch (err) {
      toast.error(t('novel.list.fetch.failed') + ':' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchNovels();
  }, [fetchNovels]);

  const handleOpen = (id) => {
    // 在跳转前就把列表项推入最近访问(标题/作者从已有列表数据取,无需等 overview 拉取)
    const target = novels.find((n) => String(n.id) === String(id));
    if (target) {
      pushRecentNovel({ id: target.id, title: target.title, author: target.author });
    }
    navigate(`/novels/${id}/overview`);
  };

  const handleCreate = () => {
    navigate('/novels/new');
  };

  const handlePickTemplate = (tpl) => {
    navigate('/novels/new', { state: { template: tpl } });
  };

  const handleDelete = async (e, novel) => {
    e.stopPropagation();
    const ok = window.confirm(
      t('novel.list.delete.confirm', `删除小说《${novel.title}》?`).replace(
        '{{title}}',
        novel.title
      )
    );
    if (!ok) return;
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
    }
  };

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
    <div className="flex min-h-screen flex-col">
      {/* 头部 */}
      <header className="border-b border-cyan-400/10 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="sf-heading">{t('novel.list.title')}</div>
            <p className="mt-2 pl-4 text-[12px] tracking-wide text-cyan-300/50">
              {t('novel.list.subtitle')}
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
          >
            <Plus className="h-4 w-4" />
            {t('novel.list.create')}
          </button>
        </div>
      </header>

      {/* 列表区 */}
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-8 sm:py-8">
        {/* 最近访问 */}
        {!loading && <RecentNovels />}

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {novels.map((novel) => (
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
                      onClick={(e) => handleDelete(e, novel)}
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
                      '"STXingkai", "华文行楷", "Xingkai SC", "楷体", "KaiTi", "STKaiti", cursive'
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
    </div>
  );
}
