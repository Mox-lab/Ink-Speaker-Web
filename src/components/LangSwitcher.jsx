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
export default function LangSwitcher({ variant = 'ghost', className = '', size = 'h-3.5 w-3.5', padding = '!px-1.5 !py-1', btnClass = 'sf-btn-ghost' }) {
  const { isZh, toggle } = useI18n();

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggle}
        className={`${btnClass} ${padding} transition ${className}`}
        title={isZh ? 'Switch to English' : '切换为中文'}
      >
        <Languages className={size} />
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
  className: PropTypes.string,
  size: PropTypes.string,
  padding: PropTypes.string,
  btnClass: PropTypes.string
};
