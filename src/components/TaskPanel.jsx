import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, MinusCircle, RotateCcw, XCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import { useTask } from '../context/TaskContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * UX-07 浮动任务面板。
 *
 * <p>固定在右下角,展示所有进行中/失败的任务;展开时显示进度条,收起时仅显示未完成计数。
 * 完成的任务自动在 5 秒后从面板移除。</p>
 *
 * <p>交互:</p>
 * <ul>
 *   <li>顶部「收起 / 展开」切换</li>
 *   <li>每个任务卡片显示标题 / 进度 / 状态图标 / 重试或取消按钮</li>
 *   <li>失败任务长亮,直到用户重试或手动关闭</li>
 * </ul>
 */
export default function TaskPanel() {
  const { t } = useI18n();
  const { tasks, cancelTask, retryTask, clearTask } = useTask();
  const [collapsed, setCollapsed] = useState(false);

  // 完成的任务 5 秒后自动移除(避免堆积)
  useEffect(() => {
    const dones = tasks.filter((tk) => tk.status === 'done');
    if (dones.length === 0) return;
    const timer = setTimeout(() => {
      dones.forEach((tk) => clearTask(tk.id));
    }, 5000);
    return () => clearTimeout(timer);
  }, [tasks, clearTask]);

  // 仅显示进行中 + 失败的任务;已 done 的等待自动清理的 5 秒窗口内显示
  const visible = tasks.filter((tk) => tk.status !== 'cancelled');
  const runningCount = tasks.filter((tk) => tk.status === 'running').length;
  const failedCount = tasks.filter((tk) => tk.status === 'failed').length;

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded border border-cyan-400/20 bg-black/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-cyan-400/10 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/80">
          {runningCount > 0 ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
          )}
          {t('task.panelTitle')}
          <span className="font-mono text-[10px] text-white/40">
            {runningCount > 0 && ` · ${runningCount} ${t('task.running')}`}
            {failedCount > 0 && ` · ${failedCount} ${t('task.failed')}`}
          </span>
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="rounded p-1 text-white/40 transition hover:bg-white/5 hover:text-cyan-300"
          title={collapsed ? t('task.expand') : t('task.collapse')}
        >
          {collapsed ? <MinusCircle className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="max-h-[40vh] space-y-2 overflow-y-auto p-2">
          {visible.map((tk) => (
            <TaskCard key={tk.id} task={tk} onCancel={cancelTask} onRetry={retryTask} onClear={clearTask} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onCancel, onRetry, onClear, t }) {
  const statusIcon = {
    running: <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />,
    done: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />,
    failed: <AlertCircle className="h-3.5 w-3.5 text-rose-300" />,
    cancelled: <XCircle className="h-3.5 w-3.5 text-white/40" />
  }[task.status];

  const pct = Math.round((task.progress || 0) * 100);

  return (
    <div className="rounded border border-cyan-400/10 bg-cyan-400/[0.02] p-2">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{statusIcon}</div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-[11px] text-white/85">{task.title}</div>
          {task.status === 'running' && (
            <>
              <div className="mt-1 h-1 overflow-hidden rounded bg-white/10">
                <div
                  className="h-full bg-cyan-400/70 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-0.5 flex justify-between font-mono text-[9px] text-white/40">
                <span>{t('task.running')}</span>
                <span>{pct}%</span>
              </div>
            </>
          )}
          {task.status === 'failed' && (
            <div className="mt-0.5 line-clamp-2 text-[10px] text-rose-300/80">{task.error}</div>
          )}
          {task.status === 'done' && (
            <div className="mt-0.5 font-mono text-[10px] text-emerald-300/70">{t('task.done')}</div>
          )}
        </div>
      </div>
      {/* 操作按钮 */}
      <div className="mt-1.5 flex items-center justify-end gap-1">
        {task.status === 'running' && (
          <button
            onClick={() => onCancel(task.id)}
            className="rounded px-1.5 py-0.5 text-[10px] tracking-widest text-white/40 transition hover:bg-white/5 hover:text-rose-300"
          >
            {t('task.cancel')}
          </button>
        )}
        {task.status === 'failed' && (
          <button
            onClick={() => onRetry(task.id)}
            className="flex items-center gap-1 rounded border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] tracking-widest text-cyan-300 transition hover:bg-cyan-400/20"
          >
            <RotateCcw className="h-3 w-3" />
            {t('task.retry')}
          </button>
        )}
        {(task.status === 'done' || task.status === 'failed') && (
          <button
            onClick={() => onClear(task.id)}
            className="rounded px-1.5 py-0.5 text-[10px] tracking-widest text-white/40 transition hover:bg-white/5 hover:text-white/80"
          >
            {t('task.dismiss')}
          </button>
        )}
      </div>
    </div>
  );
}

TaskPanel.propTypes = {
  // TaskPanel 自身无 props,完全从 context 取
};
