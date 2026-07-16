import { useEffect, useState } from 'react';
import { Loader2, History, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  listChapterHistory,
  getChapterHistoryDetail
} from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 章节历史快照面板(BASE-07)。
 * <p>Drawer 形式列出指定章节的所有历史版本,点击查看正文,支持"回滚到该版本"。</p>
 *
 * @param {Object} props
 * @param {boolean} props.open        是否打开
 * @param {number}  props.chapterId   章节 ID(为空则面板不加载)
 * @param {Function} props.onRestore  (content, snapshot) => void  回滚到该版本
 * @param {Function} props.onClose    关闭
 */
export default function ChapterHistoryPanel({ open, chapterId, onRestore, onClose }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!open || !chapterId) return;
    setLoading(true);
    setSelectedId(null);
    setDetail(null);
    listChapterHistory(chapterId)
      .then((r) => setList(r || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [open, chapterId]);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setDetail(null);
    getChapterHistoryDetail(selectedId)
      .then((r) => setDetail(r))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  if (!open) return null;

  const handleRestore = () => {
    if (!detail?.content) return;
    onRestore?.(detail.content, detail);
    toast.success(t('chapter.history.restored'));
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-3xl flex-col border-l border-cyan-400/20 bg-[#0a0e1a]">
        <div className="flex items-center justify-between border-b border-cyan-400/10 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] tracking-widest text-cyan-300">
            <History className="h-4 w-4" />
            {t('chapter.history.title')}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-white/40 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* 左:快照列表 */}
          <div className="w-56 shrink-0 overflow-y-auto border-r border-cyan-400/10">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-cyan-300/60">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : list.length === 0 ? (
              <div className="py-8 text-center text-[11px] tracking-wide text-white/30">
                {t('chapter.history.empty')}
              </div>
            ) : (
              <ul className="space-y-0.5 p-1.5">
                {list.map((h, idx) => (
                  <li key={h.id}>
                    <button
                      onClick={() => setSelectedId(h.id)}
                      className={`w-full rounded border px-2 py-1.5 text-left transition ${
                        selectedId === h.id
                          ? 'border-cyan-300 bg-cyan-400/[0.08]'
                          : 'border-transparent hover:border-cyan-300/30 hover:bg-cyan-400/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-cyan-300/70">
                          #{String(list.length - idx).padStart(2, '0')}
                        </span>
                        <span className="truncate text-[11px] text-white/80">
                          {h.title || t('chapter.history.untitled')}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[9px] tracking-wide text-white/30">
                        {h.wordCount || 0} {t('chapter.history.words')}
                        {h.createdAt && ` · ${formatTime(h.createdAt)}`}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 右:正文预览 */}
          <div className="flex min-w-0 flex-1 flex-col">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12 text-cyan-300/60">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : !detail ? (
              <div className="py-12 text-center text-[11px] tracking-wide text-white/30">
                {t('chapter.history.selectHint')}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-cyan-400/10 px-3 py-2">
                  <div className="text-[11px] tracking-widest text-cyan-300/60">
                    {t('chapter.history.snapshotVersion')} #{detail.snapshotVersion ?? '-'}
                  </div>
                  <button
                    onClick={handleRestore}
                    className="sf-btn-ghost"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t('chapter.history.restore')}
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-white/80">
                  {detail.content}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}
