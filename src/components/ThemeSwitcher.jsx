/**
 * 主题切换器组件。
 * 支持三套主题自由切换:科幻风 / Linear 风 / Stripe 风。
 *
 * @param {object} props
 * @param {'dropdown'|'minimal'|'inline'} [props.variant='dropdown'] 视觉风格
 * @param {string} [props.className=''] 附加类名
 * @returns {JSX.Element}
 * @author songshan.li (ID: 17099618)
 */
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Brush, Droplets, ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import PropTypes from 'prop-types';

/** 主题图标映射 */
const THEME_ICONS = {
  sparkles: Sparkles,
  brush: Brush,
  droplets: Droplets,
};

export default function ThemeSwitcher({ variant = 'dropdown', className = '', size = 'h-3.5 w-3.5', padding = '!px-1.5 !py-1', btnClass = 'sf-btn-ghost' }) {
  const { theme, themes, setTheme } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];
  const CurrentIcon = THEME_ICONS[currentTheme.icon] || Sparkles;

  /* ===== minimal:纯图标按钮,展示下一个主题的图标,点击循环切换 ===== */
  if (variant === 'minimal') {
    const idx = themes.findIndex((item) => item.id === theme);
    const nextTheme = themes[(idx + 1) % themes.length];
    const NextIcon = THEME_ICONS[nextTheme.icon] || Sparkles;
    return (
      <button
        onClick={() => setTheme(nextTheme.id)}
        className={`${btnClass} ${padding} transition ${className}`}
        title={t(`theme.${nextTheme.id}`)}
      >
        <NextIcon className={size} />
      </button>
    );
  }

  /* ===== inline:横向排列所有选项 ===== */
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {themes.map((item) => {
          const Icon = THEME_ICONS[item.icon] || Sparkles;
          const active = item.id === theme;
          return (
            <button
              key={item.id}
              onClick={() => setTheme(item.id)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 font-mono text-[10px] tracking-widest transition ${
                active ? 'font-bold' : 'opacity-50 hover:opacity-80'
              }`}
              style={{
                color: active ? 'var(--sf-accent)' : 'var(--sf-text-dim)',
                background: active
                  ? 'rgba(var(--sf-accent-r), var(--sf-accent-g), var(--sf-accent-b), 0.1)'
                  : 'transparent',
                border: `1px solid ${active ? 'var(--sf-border-strong)' : 'var(--sf-border)'}`,
              }}
            >
              <Icon className="h-3 w-3" />
              {t(`theme.${item.id}`)}
            </button>
          );
        })}
      </div>
    );
  }

  /* ===== dropdown:下拉菜单(默认) ===== */
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[10px] tracking-widest transition"
        style={{
          borderColor: open ? 'var(--sf-border-strong)' : 'var(--sf-border)',
          color: 'var(--sf-accent)',
          background: 'rgba(var(--sf-accent-r), var(--sf-accent-g), var(--sf-accent-b), 0.06)',
        }}
        title={t('theme.switch')}
      >
        <CurrentIcon className="h-3 w-3" />
        <span>{t(`theme.${currentTheme.id}`)}</span>
        <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="sf-panel absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded p-1"
          style={{ borderColor: 'var(--sf-border)' }}
        >
          {themes.map((item) => {
            const Icon = THEME_ICONS[item.icon] || Sparkles;
            const active = item.id === theme;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTheme(item.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs transition"
                style={{
                  color: active ? 'var(--sf-accent)' : 'var(--sf-text-dim)',
                  background: active
                    ? 'rgba(var(--sf-accent-r), var(--sf-accent-g), var(--sf-accent-b), 0.08)'
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(var(--sf-accent-r), var(--sf-accent-g), var(--sf-accent-b), 0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="flex-1">{t(`theme.${item.id}`)}</span>
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

ThemeSwitcher.propTypes = {
  variant: PropTypes.oneOf(['dropdown', 'minimal', 'inline']),
  className: PropTypes.string,
  size: PropTypes.string,
  padding: PropTypes.string,
  btnClass: PropTypes.string,
};
