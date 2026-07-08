import { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * 简易 Diff 视图(P2 前端面板补齐)。
 * <p>对比"草稿"与"润色后"两段文本,逐行高亮新增/删除/未变行。
 * 不引入完整 diff 库,按行做 LCS 简化实现,足以满足章节润色可视化。</p>
 *
 * @param {object} props
 * @param {string} [props.before=''] 原文(草稿)
 * @param {string} [props.after='']  改写后(润色结果)
 * @returns {JSX.Element}
 */
export default function DiffView({ before = '', after = '' }) {
  const diffLines = useMemo(() => computeDiff(before, after), [before, after]);

  const addCount = diffLines.filter((d) => d.type === 'add').length;
  const delCount = diffLines.filter((d) => d.type === 'del').length;
  const eqCount = diffLines.filter((d) => d.type === 'eq').length;

  return (
    <div className="sf-panel-hud overflow-hidden p-0">
      <div className="border-b border-cyan-400/10 px-3 py-2 font-mono text-[10px] tracking-widest text-cyan-300/60">
        <span>{`// DIFF · ${addCount} ADD · ${delCount} DEL · ${eqCount} EQ`}</span>
      </div>
      <div className="max-h-[480px] overflow-auto bg-black/60 font-mono text-xs">
        {diffLines.map((line, i) => {
          const bg = lineBgClass(line.type);
          const marker = lineMarker(line.type);
          return (
            <div key={`${line.type}-${i}-${line.text}`} className={`flex ${bg}`}>
              <span className="w-6 shrink-0 border-r border-cyan-400/10 px-1 text-white/30">
                {marker}
              </span>
              <span className="whitespace-pre-wrap break-all px-2 py-0.5">{line.text || ' '}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 行类型 → 背景样式。
 * @param {'add'|'del'|'eq'} type
 * @returns {string}
 */
function lineBgClass(type) {
  if (type === 'add') return 'bg-emerald-400/10 text-emerald-200';
  if (type === 'del') return 'bg-rose-400/10 text-rose-200 line-through opacity-70';
  return 'text-white/50';
}

/**
 * 行类型 → 标记符。
 * @param {'add'|'del'|'eq'} type
 * @returns {string}
 */
function lineMarker(type) {
  if (type === 'add') return '+';
  if (type === 'del') return '-';
  return ' ';
}

DiffView.propTypes = {
  before: PropTypes.string,
  after: PropTypes.string
};

/**
 * 行级 LCS Diff。
 * @param {string} before
 * @param {string} after
 * @returns {Array<{type: 'add'|'del'|'eq', text: string}>}
 */
function computeDiff(before, after) {
  const a = (before || '').split('\n');
  const b = (after || '').split('\n');
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'eq', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i] });
      i++;
    } else {
      out.push({ type: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] });
  while (j < m) out.push({ type: 'add', text: b[j++] });
  return out;
}
