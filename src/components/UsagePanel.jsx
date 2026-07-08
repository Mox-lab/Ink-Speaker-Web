import { useEffect, useState } from 'react';
import { Cpu, Activity, Gauge } from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';
import { STORAGE_KEYS } from '../constants/storage.js';
import { loadLocal } from '../utils/storage.js';

/**
 * Token 用量统计面板(P2 前端面板补齐)。
 * <p>显示当前会话最近一次 LLM 调用的 token 用量与累计用量。
 * 数据来源:后端通过 actuator metrics 暴露的 langchain4j 自定义指标
 * (当前阶段先展示本地 sessionStorage 中的累计值,后续接入 Prometheus 拉取)。</p>
 *
 * 简化策略:监听 localStorage 中的 ink_speaker_token_log,每次章节/大纲/对话调用后追加。
 */
export default function UsagePanel() {
  const { t } = useI18n();
  const [usage, setUsage] = useState({ calls: 0, chars: 0, lastAt: '-' });
  const [budget, setBudget] = useState({ used: 0, total: 6000 });

  useEffect(() => {
    const load = () => {
      const arr = loadLocal(STORAGE_KEYS.TOKEN_LOG) || [];
      if (arr.length === 0) {
        setUsage({ calls: 0, chars: 0, lastAt: '-' });
        setBudget({ used: 0, total: 6000 });
        return;
      }
      const calls = arr.length;
      const chars = arr.reduce((s, x) => s + (x.chars || 0), 0);
      const lastAt = arr.length ? new Date(arr[arr.length - 1].at).toLocaleTimeString() : '-';
      setUsage({ calls, chars, lastAt });
      // 简单估算 token:中文 1.5 / 字符
      const used = Math.ceil(chars * 0.7);
      setBudget({ used, total: 6000 });
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const ratio = Math.min(100, (budget.used / budget.total) * 100);

  return (
    <div className="sf-panel-hud p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-cyan-300" />
          <span className="sf-heading text-xs">{t('usage.title')}</span>
        </div>
        <span className="font-mono text-[10px] text-white/30">{usage.lastAt}</span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 font-mono">
        <div className="rounded border border-cyan-400/15 bg-black/40 px-2 py-2 text-center">
          <div className="text-[9px] tracking-widest text-white/40">CALLS</div>
          <div className="text-lg text-cyan-300">{usage.calls}</div>
        </div>
        <div className="rounded border border-cyan-400/15 bg-black/40 px-2 py-2 text-center">
          <div className="text-[9px] tracking-widest text-white/40">CHARS</div>
          <div className="text-lg text-cyan-300">{usage.chars}</div>
        </div>
        <div className="rounded border border-cyan-400/15 bg-black/40 px-2 py-2 text-center">
          <div className="text-[9px] tracking-widest text-white/40">≈TOKENS</div>
          <div className="text-lg text-cyan-300">{budget.used}</div>
        </div>
      </div>

      <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
        <span className="flex items-center gap-1 text-white/50">
          <Gauge className="h-3 w-3" />{' '}
          {t('usage.budget').replace('{used}', budget.used).replace('{total}', budget.total)}
        </span>
        <span className={ratio > 80 ? 'text-rose-400' : 'text-cyan-300/60'}>
          {ratio.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-black/60">
        <div
          className={`h-full transition-all ${ratioColorClass(ratio)}`}
          style={{ width: `${ratio}%` }}
        />
      </div>
      <div className="mt-2 flex items-center gap-1 font-mono text-[9px] tracking-widest text-white/30">
        <Cpu className="h-2.5 w-2.5" />
        {t('usage.dataSource')}
      </div>
    </div>
  );
}

/**
 * 预算占比 → 颜色样式。
 * @param {number} ratio 0-100
 * @returns {string}
 */
function ratioColorClass(ratio) {
  if (ratio > 80) return 'bg-rose-400';
  if (ratio > 50) return 'bg-amber-400';
  return 'bg-cyan-400';
}
