import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 面包屑(UX-10)。
 *
 * <p>工作台所有子页顶部显示层级路径,每段可点回。本组件为纯展示,
 * 不带外框与边距,由父容器决定布局。</p>
 *
 * @param {Array<{label: string, to?: string}>} items 路径段;最后一项为当前页(不可点)
 *
 * @author songshan.li (ID: 17099618)
 */
export default function Breadcrumb({ items }) {
  const { t } = useI18n();
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <nav
      aria-label={t('nav.breadcrumb')}
      className="flex flex-wrap items-center gap-1 text-[11px] tracking-wider text-white/50"
    >
      {/* 首页锚点 */}
      <Link
        to="/novels"
        className="flex items-center gap-1 rounded px-1 py-0.5 text-cyan-300/70 transition hover:bg-cyan-400/10 hover:text-cyan-300"
        title={t('nav.novels')}
      >
        <Home className="h-3 w-3" />
        <span className="hidden sm:inline">{t('nav.novels')}</span>
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <Fragment key={`${idx}-${item.label || ''}`}>
            <ChevronRight className="h-3 w-3 shrink-0 text-white/30" />
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="rounded px-1 py-0.5 text-cyan-300/70 transition hover:bg-cyan-400/10 hover:text-cyan-300"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`rounded px-1 py-0.5 ${isLast ? 'text-white/80' : 'text-white/50'}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
