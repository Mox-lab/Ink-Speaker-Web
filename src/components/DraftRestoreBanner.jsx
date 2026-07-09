import { useEffect, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * UX-05 草稿恢复横幅。
 *
 * <p>挂载时若传入 {@code draft} 非空,显示「检测到未保存草稿,是否恢复?」横幅;
 * 用户点「恢复」→ 触发 {@code onRestore(draft)};
 * 点「丢弃」→ 触发 {@code onDiscard}。</p>
 *
 * <p>设计要点:横幅只负责 UI 与交互,不直接读写 storage —— 由父组件决定
 * 是否需要恢复(对比草稿与后端 updated_at),这样能保持纯展示职责。</p>
 *
 * @param {object} props
 * @param {*} props.draft         父组件已 loadDraft 的草稿对象;为 null 时不渲染
 * @param {(d: *) => void} props.onRestore 用户点击「恢复」
 * @param {() => void} props.onDiscard  用户点击「丢弃」
 * @param {string} [props.hint]   可选副文案(如「草稿保存于 5 分钟前」)
 * @returns {JSX.Element|null}
 */
export default function DraftRestoreBanner({ draft, onRestore, onDiscard, hint }) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  // 草稿变化时重置 dismissed,允许同一会话内多次提示
  useEffect(() => {
    setDismissed(false);
  }, [draft]);

  if (!draft || dismissed) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-[11px] tracking-wide text-amber-200/90">
      <History className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">
        {t('draft.restoreTitle')}
        {hint && <span className="ml-2 text-amber-200/60">{hint}</span>}
      </span>
      <button
        onClick={() => {
          setDismissed(true);
          onRestore?.(draft);
        }}
        className="flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] tracking-widest text-amber-200 transition hover:bg-amber-400/20"
      >
        <RotateCcw className="h-3 w-3" />
        {t('draft.restore')}
      </button>
      <button
        onClick={() => {
          setDismissed(true);
          onDiscard?.();
        }}
        className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] tracking-widest text-amber-200/60 transition hover:text-amber-200"
      >
        <X className="h-3 w-3" />
        {t('draft.discard')}
      </button>
    </div>
  );
}

DraftRestoreBanner.propTypes = {
  draft: PropTypes.any,
  onRestore: PropTypes.func,
  onDiscard: PropTypes.func,
  hint: PropTypes.string
};
