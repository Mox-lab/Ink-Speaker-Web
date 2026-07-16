import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 403 无权限页。
 *
 * <p>非管理员访问 {@code /admin/**} 时由 {@link ProtectedRoute} 重定向至此。</p>
 *
 * @author songshan.li (ID: 17099618)
 */
export default function Forbidden() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <ShieldX className="h-16 w-16 text-red-400/70" />
      <div className="text-2xl tracking-wide text-white/90">403</div>
      <div className="text-sm text-white/50">{t('common.forbidden') || '无权限访问该页面'}</div>
      <button
        onClick={() => navigate('/novels')}
        className="mt-2 rounded border border-cyan-400/30 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/10"
      >
        {t('nav.backToNovels')}
      </button>
    </div>
  );
}
