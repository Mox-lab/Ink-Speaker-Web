import { Loader2, History, X, ChevronRight } from 'lucide-react';
import PropTypes from 'prop-types';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 历史记录侧抽屉。
 *
 * @param {object} props
 * @param {boolean} props.open       是否展开
 * @param {() => void} props.onClose 关闭回调
 * @param {string} [props.title]     标题(如「大纲历史」)
 * @param {Array} [props.items=[]]   记录数组,每项需含 id, title/desc, meta(时间/版本等), active
 * @param {boolean} [props.loading=false] 加载中
 * @param {(item: object) => void} [props.onSelect]  选中加载
 * @param {(item: object) => void} [props.onDelete]  删除
 * @param {(item: object) => JSX.Element} [props.renderMeta] 自定义元信息渲染
 * @returns {JSX.Element | null}
 */
export default function HistoryDrawer({
  open,
  onClose,
  title,
  items = [],
  loading = false,
  onSelect,
  onDelete,
  renderMeta
}) {
  const { t } = useI18n();
  if (!open) return null;

  const heading = title || t('common.history');

  const emptyState = (
    <div className="flex h-full items-center justify-center text-center text-white/30">
      <div>
        <History className="mx-auto mb-2 h-10 w-10 opacity-40" />
        <div className="text-xs tracking-wide text-white/40">{t('common.empty')}</div>
      </div>
    </div>
  );

  const loadingState = (
    <div className="flex h-full items-center justify-center text-white/30">
      <Loader2 className="h-6 w-6 animate-spin text-cyan-300/60" />
    </div>
  );

  const listState = (
    <ul className="space-y-2">
      {items.map((it) => (
        <li
          key={it.id}
          className={`sf-scan group rounded border p-3 transition cursor-pointer ${
            it.active ? 'border-cyan-300/60 bg-cyan-300/[0.08]' : 'border-cyan-400/15 bg-black/40 hover:border-cyan-300/40'
          }`}
          onClick={() => onSelect?.(it)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {it.active ? (
                  <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-1.5 py-0.5 text-[9px] tracking-widest text-cyan-300">
                    ACTIVE
                  </span>
                ) : null}
                <span className="text-sm font-bold text-white truncate">
                  {it.title || `#${it.id}`}
                </span>
              </div>
              {it.desc ? (
                <div className="text-xs text-white/50 line-clamp-2">{it.desc}</div>
              ) : null}
              {renderMeta ? (
                renderMeta(it)
              ) : (
                <div className="mt-1 font-mono text-[10px] tracking-widest text-cyan-300/40">
                  {it.meta}
                </div>
              )}
            </div>
            <div className="flex items-center opacity-0 transition group-hover:opacity-100">
              <ChevronRight className="h-4 w-4 text-cyan-300/60" />
            </div>
          </div>
          {onDelete ? (
            <div className="mt-2 flex justify-end border-t border-cyan-400/10 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(it);
                }}
                className="font-mono text-[10px] tracking-widest text-rose-300/60 hover:text-rose-300"
              >
                {t('common.delete').toUpperCase()}
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );

  const bodyContent = resolveBodyContent(loading, items.length, loadingState, emptyState, listState);

  return (
    <>
      {/* 遮罩:键盘可关闭 */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="close drawer"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose?.();
        }}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[420px] flex-col border-l border-cyan-400/20 bg-[#050a14]/95 shadow-[0_0_40px_rgba(56,230,255,0.1)]">
        {/* 顶部 */}
        <div className="flex items-center justify-between border-b border-cyan-400/15 px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-300" />
            <span className="sf-chip">{heading.toUpperCase()}</span>
          </div>
          <button onClick={onClose} className="sf-btn-ghost !px-2 !py-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-3">
          {bodyContent}
        </div>
      </aside>
    </>
  );
}

/**
 * 三态选择器:loading / empty / list。
 */
function resolveBodyContent(loading, itemCount, loadingState, emptyState, listState) {
  if (loading) return loadingState;
  if (itemCount === 0) return emptyState;
  return listState;
}

HistoryDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  onSelect: PropTypes.func,
  onDelete: PropTypes.func,
  renderMeta: PropTypes.func
};
