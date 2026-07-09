import { createContext, useCallback, useContext, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'sonner';
import { useI18n } from './I18nContext.jsx';
import { useNotifications } from './NotificationContext.jsx';

/**
 * UX-07 全局任务上下文。
 *
 * <p>管理所有长任务(章节生成/大纲生成/人物抽取)的生命周期,
 * 提供 {@link #runTask} 注册任务并自动推进进度,失败时弹带「重试」按钮的 toast。</p>
 *
 * <p>简化方案(对应设计文档 §12 UX-07 推荐):</p>
 * <ul>
 *   <li>不引入后端任务队列,所有进度都是前端模拟(每 4 秒 +12%,完成时由 Promise resolve 决定)</li>
 *   <li>任务在内存中维护,刷新页面会丢失 —— P2 阶段可改为 sessionStorage 持久化</li>
 *   <li>取消 = 标记 cancelled,Promise 仍继续但结果被丢弃</li>
 * </ul>
 *
 * <p>任务对象结构:</p>
 * <pre>{@code
 * {
 *   id: 'task-uuid',
 *   type: 'chapter_generate' | 'outline_generate' | 'character_extract' | 'inline_ai',
 *   title: '章节生成 · 第 23 章',
 *   status: 'running' | 'done' | 'failed' | 'cancelled',
 *   progress: 0.6,        // 0-1
 *   startedAt: number,    // Date.now()
 *   params: any,          // 原始参数,用于重试
 *   result: any,          // 完成时的结果
 *   error: string | null, // 失败时的错误消息
 *   run: () => Promise<any>  // 实际执行函数(闭包),重试时调用
 * }
 * }</pre>
 */
const TaskContext = createContext(null);

let taskSeq = 0;
const nextTaskId = () => `task-${Date.now()}-${++taskSeq}`;

export function TaskProvider({ children }) {
  const { t } = useI18n();
  const { push: pushNotification } = useNotifications();
  const [tasks, setTasks] = useState([]);
  const timersRef = useRef(new Map()); // taskId -> interval id

  const updateTask = useCallback((id, patch) => {
    setTasks((prev) => prev.map((tk) => (tk.id === id ? { ...tk, ...patch } : tk)));
  }, []);

  const clearTask = useCallback((id) => {
    setTasks((prev) => prev.filter((tk) => tk.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearInterval(tm);
      timersRef.current.delete(id);
    }
  }, []);

  /**
   * 启动一个长任务。
   * @param {object} opts
   * @param {string} opts.type 任务类型
   * @param {string} opts.title 任务显示名(已 i18n)
   * @param {object} [opts.params] 任务参数,失败重试时透传
   * @param {() => Promise<any>} opts.run 实际执行函数,resolve 为结果,reject 为失败
   * @param {(result: any) => void} [opts.onSuccess] 成功回调(如写入页面 state)
   * @param {string} [opts.successMsg] 成功 toast 文案
   * @returns {string} taskId
   */
  const runTask = useCallback(
    (opts) => {
      const { type, title, params, run, onSuccess, successMsg } = opts;
      const id = nextTaskId();
      const task = {
        id,
        type,
        title,
        status: 'running',
        progress: 0,
        startedAt: Date.now(),
        params,
        result: null,
        error: null,
        run
      };
      setTasks((prev) => [...prev, task]);

      // 进度模拟:每 4 秒 +12%,封顶 0.92(留 8% 给真正完成)
      const intervalId = setInterval(() => {
        setTasks((prev) =>
          prev.map((tk) =>
            tk.id === id && tk.status === 'running'
              ? { ...tk, progress: Math.min(0.92, tk.progress + 0.12) }
              : tk
          )
        );
      }, 4000);
      timersRef.current.set(id, intervalId);

      // 执行 Promise
      Promise.resolve()
        .then(() => run())
        .then(
          (result) => {
            const tm = timersRef.current.get(id);
            if (tm) {
              clearInterval(tm);
              timersRef.current.delete(id);
            }
            // 若已取消,丢弃结果
            setTasks((prev) => {
              const cur = prev.find((tk) => tk.id === id);
              if (!cur || cur.status === 'cancelled') return prev;
              return prev.map((tk) =>
                tk.id === id ? { ...tk, status: 'done', progress: 1, result } : tk
              );
            });
            if (successMsg) toast.success(successMsg);
            // 推送成功通知(UX-10 通知中心)
            pushNotification({
              type: 'success',
              title,
              body: successMsg || ''
            });
            if (onSuccess) {
              try {
                onSuccess(result);
              } catch {
                // 回调异常不影响任务状态
              }
            }
          },
          (err) => {
            const tm = timersRef.current.get(id);
            if (tm) {
              clearInterval(tm);
              timersRef.current.delete(id);
            }
            const msg = err?.response?.data?.message || err?.message || String(err);
            setTasks((prev) =>
              prev.map((tk) => (tk.id === id ? { ...tk, status: 'failed', error: msg } : tk))
            );
            // 推送失败通知
            pushNotification({
              type: 'error',
              title,
              body: msg
            });
            // 失败 toast 带「重试」按钮
            toast.error(`${title} · ${msg}`, {
              duration: 10000,
              action: {
                label: t('task.retry'),
                onClick: () => {
                  // 重试时使用原 params + 原 run 闭包
                  runTask({ type, title, params, run, onSuccess, successMsg });
                }
              }
            });
          }
        );

      return id;
    },
    [t, pushNotification]
  );

  /** 取消任务(标记 cancelled,Promise 继续但结果丢弃) */
  const cancelTask = useCallback(
    (id) => {
      const tm = timersRef.current.get(id);
      if (tm) {
        clearInterval(tm);
        timersRef.current.delete(id);
      }
      setTasks((prev) =>
        prev.map((tk) => (tk.id === id ? { ...tk, status: 'cancelled' } : tk))
      );
      toast.info(t('task.cancelled'));
    },
    [t]
  );

  /** 重试失败的任务(用原 params + 原 run 闭包) */
  const retryTask = useCallback(
    (id) => {
      const task = tasks.find((tk) => tk.id === id);
      if (!task || task.status !== 'failed') return;
      clearTask(id);
      runTask({
        type: task.type,
        title: task.title,
        params: task.params,
        run: task.run,
        onSuccess: task.onSuccess,
        successMsg: task.successMsg
      });
    },
    [tasks, clearTask, runTask]
  );

  const value = { tasks, runTask, cancelTask, retryTask, clearTask };
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

TaskProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useTask() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTask 必须在 TaskProvider 内使用');
  return ctx;
}
