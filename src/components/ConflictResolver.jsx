import { useEffect, useState } from 'react';
import { Loader2, GitMerge, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import DiffView from './DiffView.jsx';
import { getChapter } from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 多设备冲突合并对话框(UX-08)。
 * <p>当章节保存返回 4091(CONFLICT_4091)时,前端弹此组件让用户:
 * <ol>
 *   <li>查看本地草稿 vs 服务端最新版本的 Diff</li>
 *   <li>选择"用服务端覆盖本地"(放弃本地修改)</li>
 *   <li>选择"用本地强制覆盖"(忽略冲突,重新保存且不带 clientUpdatedAt)</li>
 * </ol>
 * </p>
 *
 * @param {Object} props
 * @param {boolean} props.open           是否显示
 * @param {number}  props.chapterId      冲突章节 ID
 * @param {string} props.localContent    本地草稿正文
 * @param {Function} props.onUseServer   (serverContent, serverChapter) => void  采用服务端
 * @param {Function} props.onForceLocal  () => void  强制再次保存本地(不带 clientUpdatedAt)
 * @param {Function} props.onClose       关闭弹窗
 */
export default function ConflictResolver({
  open,
  chapterId,
  localContent,
  onUseServer,
  onForceLocal,
  onClose
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [serverChapter, setServerChapter] = useState(null);

  useEffect(() => {
    if (!open || !chapterId) return;
    setLoading(true);
    getChapter(chapterId)
      .then((detail) => {
        setServerChapter(detail);
      })
      .catch(() => {
        toast.error(t('chapter.conflict.loadServerFailed'));
        setServerChapter(null);
      })
      .finally(() => setLoading(false));
  }, [open, chapterId, t]);

  if (!open) return null;

  const serverContent = serverChapter?.content || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl rounded border border-amber-400/30 bg-[#0a0e1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-amber-400/20 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] tracking-widest text-amber-300">
            <GitMerge className="h-4 w-4" />
            {t('chapter.conflict.title')}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-white/40 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-2 text-[11px] leading-relaxed text-amber-200/70">
          {t('chapter.conflict.hint')}
        </div>

        <div className="max-h-[55vh] overflow-auto px-4 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-cyan-300/60">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('common.loading')}
            </div>
          ) : (
            <DiffView before={serverContent} after={localContent || ''} />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-cyan-400/10 px-4 py-3">
          <button
            onClick={() => onUseServer(serverContent, serverChapter)}
            disabled={loading || !serverChapter}
            className="sf-btn-ghost"
          >
            <RefreshCw className="h-3 w-3" />
            {t('chapter.conflict.useServer')}
          </button>
          <button
            onClick={onForceLocal}
            disabled={loading}
            className="sf-btn"
          >
            <GitMerge className="h-3 w-3" />
            {t('chapter.conflict.forceLocal')}
          </button>
        </div>
      </div>
    </div>
  );
}
