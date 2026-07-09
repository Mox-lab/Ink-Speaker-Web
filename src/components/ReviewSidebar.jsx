import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, RefreshCw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';
import {
  listReviewIssues,
  listOpenReviewIssues,
  updateReviewStatus
} from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 审查问题侧栏(P1 多 Agent 协作产物可视化)。
 * <p>展示 DirectorAgent → ReviewAgent 异步生成的章节一致性问题,
 * 支持按章节过滤、按严重度排序、状态切换(open / resolved / ignored)。</p>
 *
 * @param {object} props
 * @param {number} [props.chapterNo] 当前章节序号(可选,传入则只展示该章问题;否则展示全部未解决)
 * @param {() => void} props.onClose 关闭回调
 * @returns {JSX.Element}
 */
export default function ReviewSidebar({ chapterNo, onClose }) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all / open / resolved / ignored

  const load = async () => {
    setLoading(true);
    try {
      const list = chapterNo
        ? await listReviewIssues(chapterNo)
        : await listOpenReviewIssues();
      setItems(list || []);
    } catch (err) {
      toast.error(t('review.loadFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [chapterNo]);

  const handleStatus = async (id, status) => {
    try {
      await updateReviewStatus(id, status);
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
      toast.success(t('review.statusUpdated'));
    } catch (err) {
      toast.error(t('review.updateFailed') + ':' + (err.response?.data?.message || err.message));
    }
  };

  const filtered = items.filter((x) => filter === 'all' || x.status === filter);

  const severityIcon = (sev) => {
    if (sev === 'high') return <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />;
    if (sev === 'medium') return <Shield className="h-3.5 w-3.5 text-amber-400" />;
    return <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />;
  };

  const severityColor = (sev) => {
    if (sev === 'high') return 'border-rose-400/30 bg-rose-400/5';
    if (sev === 'medium') return 'border-amber-400/30 bg-amber-400/5';
    return 'border-cyan-400/30 bg-cyan-400/5';
  };

  const statusClass = (status) => {
    if (status === 'open') return 'text-amber-300';
    if (status === 'resolved') return 'text-emerald-300';
    return 'text-white/40';
  };

  const filterLabels = {
    all: t('review.filterAll'),
    open: t('review.filterOpen'),
    resolved: t('review.filterResolved'),
    ignored: t('review.filterIgnored')
  };

  return (
    <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-[384px] flex-col border-l border-cyan-400/15 bg-black/85 backdrop-blur-md">
      <header className="flex items-center justify-between border-b border-cyan-400/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-300" />
          <span className="sf-heading text-sm">{t('review.heading')}</span>
          {chapterNo ? <span className="sf-chip">{t('review.chapterLabel').replace('{n}', chapterNo)}</span> : null}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={load} className="sf-btn-ghost !p-1.5" title={t('common.refresh')}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="sf-btn-ghost !p-1.5" title={t('common.cancel')}>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-cyan-400/10 px-3 py-2 font-mono text-[10px] tracking-widest">
        {['all', 'open', 'resolved', 'ignored'].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded px-2 py-1 ${
              filter === k ? 'bg-cyan-400/20 text-cyan-200' : 'text-white/40 hover:text-cyan-300'
            }`}
          >
            {filterLabels[k].toUpperCase()}
          </button>
        ))}
        <span className="ml-auto text-white/30">{filtered.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {resolveReviewBody(loading, items.length, filtered.length, t, filtered, severityIcon, severityColor, statusClass, handleStatus)}
      </div>
    </div>
  );
}

/**
 * 三态渲染:loading / empty / 列表。
 */
function resolveReviewBody(loading, itemCount, filteredCount, t, filtered, severityIcon, severityColor, statusClass, handleStatus) {
  if (loading && itemCount === 0) {
    return (
      <div className="py-10 text-center text-white/30">
        <span className="text-xs tracking-wide text-white/50">{t('common.loading')}...</span>
      </div>
    );
  }
  if (filteredCount === 0) {
    return (
      <div className="py-10 text-center text-white/30">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
        <div className="text-xs tracking-wide text-white/40">{t('review.noIssues')}</div>
      </div>
    );
  }
  return filtered.map((issue) => (
    <div
      key={issue.id}
      className={`mb-2 rounded border p-3 ${severityColor(issue.severity)}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {severityIcon(issue.severity)}
          <span className="font-mono text-[10px] tracking-widest text-white/70">
            {issue.category}
          </span>
        </div>
        <span className={`font-mono text-[10px] ${statusClass(issue.status)}`}>
          {issue.status.toUpperCase()}
        </span>
      </div>
      {issue.location ? (
        <div className="mb-1 rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-cyan-300/60">
          「{issue.location}」
        </div>
      ) : null}
      <div className="mb-1 text-xs text-white/80">{issue.description}</div>
      {issue.suggestion ? (
        <div className="text-[11px] text-cyan-300/70">
          {t('review.suggestion')}:{issue.suggestion}
        </div>
      ) : null}
      <div className="mt-2 flex items-center gap-1 border-t border-cyan-400/10 pt-2">
        <button
          onClick={() => handleStatus(issue.id, 'resolved')}
          className="rounded px-2 py-0.5 font-mono text-[10px] text-emerald-300 hover:bg-emerald-400/10"
        >
          <ShieldCheck className="mr-1 inline h-3 w-3" />
          {t('review.resolved')}
        </button>
        <button
          onClick={() => handleStatus(issue.id, 'ignored')}
          className="rounded px-2 py-0.5 font-mono text-[10px] text-white/50 hover:bg-white/10"
        >
          <ShieldX className="mr-1 inline h-3 w-3" />
          {t('review.ignored')}
        </button>
        <span className="ml-auto font-mono text-[9px] text-white/30">
          ch.{issue.chapterNo}
        </span>
      </div>
    </div>
  ));
}

ReviewSidebar.propTypes = {
  chapterNo: PropTypes.number,
  onClose: PropTypes.func.isRequired
};
