import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Users, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../context/I18nContext.jsx';
import api from '../api/client.js';

/**
 * 管理后台 · 用户管理(列举 + 启用/禁用)。
 *
 * <p>仅 ROLE_ADMIN 可访问。禁用/启用调用 {@code PATCH /api/admin/users/{id}/enabled}。</p>
 *
 * @author songshan.li (ID: 17099618)
 */
export default function AdminUsers() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('/admin/users', { params: { page, size } });
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

  const toggleEnabled = async (user) => {
    setBusyId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}/enabled`, { enabled: !user.enabled });
      toast.success(
        !user.enabled ? t('admin.toast.userEnabled') : t('admin.toast.userDisabled')
      );
      fetchPage();
    } catch {
      // 响应拦截器已 toast
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-cyan-400/10 px-4 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/novels')}
            className="rounded border border-cyan-400/30 px-2 py-1 text-cyan-300/70 transition hover:bg-cyan-400/10"
            aria-label={t('nav.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="sf-heading">{t('nav.admin.users')}</div>
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
                  <th className="px-4 py-3">{t('novel.editor.field.author')}</th>
                  <th className="px-4 py-3">{t('nav.admin')}</th>
                  <th className="px-4 py-3">{t('admin.action.toggleEnabled')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t border-white/5 hover:bg-cyan-400/[0.03]">
                    <td className="px-4 py-3 text-white/50">{u.id}</td>
                    <td className="px-4 py-3 font-medium text-white">{u.username}</td>
                    <td className="px-4 py-3 text-[11px] text-cyan-300/70">
                      {(u.roles || []).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={busyId === u.id}
                        onClick={() => toggleEnabled(u)}
                        className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition disabled:opacity-50 ${
                          u.enabled
                            ? 'border-red-400/30 text-red-300 hover:bg-red-500/10'
                            : 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10'
                        }`}
                      >
                        {u.enabled ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            {t('admin.action.disable')}
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            {t('admin.action.enable')}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
