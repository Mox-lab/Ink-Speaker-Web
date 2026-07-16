import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, X, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';

/**
 * 通知铃铛(UX-10)。
 *
 * <p>顶栏右上角铃铛 + 红点未读数 + 下拉列表。点击通知跳转对应页(to 字段),
 * 同时标记已读。提供「全部已读」「清空全部」两个批量操作。</p>
 *
 * @author songshan.li (ID: 17099618)
 */
const TYPE_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle
};

const TYPE_COLOR = {
  info: 'text-cyan-300',
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  error: 'text-red-300'
};

function formatRelative(ts, locale) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return locale === 'en' ? 'just now' : '刚刚';
  if (diff < hour) {
    const n = Math.floor(diff / minute);
    return locale === 'en' ? `${n}m ago` : `${n} 分钟前`;
  }
  if (diff < day) {
    const n = Math.floor(diff / hour);
    return locale === 'en' ? `${n}h ago` : `${n} 小时前`;
  }
  const n = Math.floor(diff / day);
  return locale === 'en' ? `${n}d ago` : `${n} 天前`;
}

export default function NotificationBell({ size = 'h-3.5 w-3.5', btnClass = 'sf-btn-ghost', padding = '!px-2 !py-1' }) {
  const { t, lang } = useI18n();
  const { notifications, unreadCount, markRead, markAllRead, remove, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  // 点外部关闭
  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleToggle = () => setOpen((v) => !v);

  const handleClickItem = (n) => {
    markRead(n.id);
    setOpen(false);
    if (n.to) navigate(n.to);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className={`${btnClass} relative ${padding}`}
        aria-label={t('notify.title')}
        title={t('notify.title')}
      >
        <Bell className={size} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[90vw] overflow-hidden rounded border border-[var(--sf-border)] bg-[var(--sf-panel-solid)] text-[var(--sf-text)] shadow-2xl backdrop-blur-xl">
          {/* 顶部 */}
          <div className="flex items-center justify-between border-b border-cyan-400/10 px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/70">
              <Bell className="h-3 w-3" />
              {t('notify.title')}
              {unreadCount > 0 && (
                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-300">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllRead}
                disabled={unreadCount === 0}
                title={t('notify.markAllRead')}
                className="rounded p-1 text-cyan-300/60 transition hover:bg-cyan-400/10 hover:text-cyan-300 disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={clearAll}
                disabled={notifications.length === 0}
                title={t('notify.clearAll')}
                className="rounded p-1 text-white/40 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 列表 */}
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[11px] tracking-wide text-white/30">
                {t('notify.empty')}
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type] || Info;
                  const color = TYPE_COLOR[n.type] || 'text-cyan-300';
                  return (
                    <li
                      key={n.id}
                      onClick={() => handleClickItem(n)}
                      className={`group flex cursor-pointer items-start gap-2 px-3 py-2.5 transition hover:bg-cyan-400/[0.04] ${
                        n.read ? 'opacity-60' : ''
                      }`}
                    >
                      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-[12px] font-medium text-white/90">
                            {n.title}
                          </div>
                          <span className="shrink-0 text-[9px] tracking-wide text-white/30">
                            {formatRelative(n.createdAt, lang)}
                          </span>
                        </div>
                        {n.body && (
                          <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/50">
                            {n.body}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id);
                        }}
                        title={t('common.delete')}
                        className="rounded p-0.5 text-white/20 opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {!n.read && (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_6px_#38e6ff]" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
