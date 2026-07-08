import { useI18n } from '../context/I18nContext.jsx';
import { Languages } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * 语言切换按钮。中/EN 一键切换。
 *
 * @param {object} props
 * @param {'ghost'|'solid'|'minimal'} [props.variant='ghost'] 视觉风格
 * @param {string} [props.className=''] 附加类名
 * @returns {JSX.Element}
 */
export default function LangSwitcher({ variant = 'ghost', className = '' }) {
  const { isZh, toggle } = useI18n();

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggle}
        className={`rounded border border-cyan-400/15 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-widest text-cyan-300/70 transition hover:border-cyan-300/50 hover:text-cyan-300 ${className}`}
        title={isZh ? 'Switch to English' : '切换为中文'}
      >
        {isZh ? 'EN' : '中'}
      </button>
    );
  }

  if (variant === 'solid') {
    return (
      <button
        onClick={toggle}
        className={`sf-btn !px-3 !py-1.5 !text-xs ${className}`}
        title={isZh ? 'Switch to English' : '切换为中文'}
      >
        <Languages className="h-3.5 w-3.5" />
        {isZh ? 'EN' : '中文'}
      </button>
    );
  }

  // ghost
  return (
    <button
      onClick={toggle}
      className={`sf-btn-ghost !px-2.5 !py-1.5 ${className}`}
      title={isZh ? 'Switch to English' : '切换为中文'}
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="font-mono text-[10px] tracking-widest">{isZh ? 'EN' : '中'}</span>
    </button>
  );
}

LangSwitcher.propTypes = {
  variant: PropTypes.oneOf(['ghost', 'solid', 'minimal']),
  className: PropTypes.string
};
