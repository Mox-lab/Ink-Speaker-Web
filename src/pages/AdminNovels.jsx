import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';
import api from '../api/client.js';

/**
 * 管理后台 · 全平台小说列表(只读)。
 *
 * <p>仅 ROLE_ADMIN 可访问(路由层 {@link ProtectedRoute} 已拦截)。
 * 数据来自 {@code GET /api/admin/novels},分页展示全部用户的小说。</p>
 *
 * @author songshan.li (ID: 17099618)
 */
export default function AdminNovels() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('/admin/novels', { params: { page, size } });
      const p = resp.data || {};
      setRows(p.list || []);
      setTotal(p.total || 0);
    } catch {
      // 响应拦截器已 toast
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    let cancelled = false;
    if (cancelled) return;
    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-cyan-400/10 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/novels')}
            className="rounded border border-cyan-400/30 px-2 py-1 text-cyan-300/70 transition hover:bg-cyan-400/10"
            aria-label={t('nav.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="sf-heading">{t('nav.admin.novels')}</div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 py-6 sm:px-8">
        {loading ? (
          <div className="py-16 text-center text-cyan-300/60">{t('common.loading')}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-white/40">{t('novel.list.empty.title')}</div>
        ) : (
          <div className="overflow-x-auto rounded border border-cyan-400/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-[11px] uppercase tracking-wider text-cyan-300/60">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">{t('novel.editor.field.title')}</th>
                  <th className="px-4 py-3">{t('novel.editor.field.author')}</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">{t('novel.list.card.updatedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id} className="border-t border-white/5 hover:bg-cyan-400/[0.03]">
                    <td className="px-4 py-3 text-white/50">{n.id}</td>
                    <td className="px-4 py-3 font-medium text-white">{n.title || '(未命名)'}</td>
                    <td className="px-4 py-3 text-white/70">{n.author || '—'}</td>
                    <td className="px-4 py-3 text-white/50">{n.ownerId}</td>
                    <td className="px-4 py-3 text-white/40">
                      {n.updatedAt ? new Date(n.updatedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        <div className="mt-4 flex items-center justify-end gap-3 text-sm text-white/60">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 rounded border border-cyan-400/20 px-3 py-1.5 transition hover:bg-cyan-400/10 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1 rounded border border-cyan-400/20 px-3 py-1.5 transition hover:bg-cyan-400/10 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
