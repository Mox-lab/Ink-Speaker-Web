import { useEffect, useState } from 'react';
import { Activity, Gauge, X } from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';
import { STORAGE_KEYS } from '../constants/storage.js';
import { loadLocal } from '../utils/storage.js';

/**
 * Token 用量统计面板(UX-12 整合)。
 *
 * <p>两种形态:</p>
 * <ul>
 *   <li>`variant="floating"`(默认,用于 /novels 右下角浮动卡片):可折叠,
 *       显示本月累计 calls / chars / 预估 tokens + 预算进度条</li>
 *   <li>`variant="inline"`(用于 Lore memory tab 旧位置):保留原内嵌面板样式</li>
 *   <li>`variant="sidebar"`(用于主框架右侧栏底部):非浮动、非独立面板的紧凑内嵌形态</li>
 * </ul>
 *
 * <p>数据来源:localStorage 中的 ink_realm_token_log,由 Chapter 生成时 appendLocal 追加。
 * 本月筛选:按当前年-月过滤 at 时间戳。</p>
 */
export default function UsagePanel({ variant = 'floating' }) {
  const { t } = useI18n();
  const [usage, setUsage] = useState({ calls: 0, chars: 0, lastAt: '-' });
  const [budget, setBudget] = useState({ used: 0, total: 6000 });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const load = () => {
      const arr = loadLocal(STORAGE_KEYS.TOKEN_LOG) || [];
      if (arr.length === 0) {
        setUsage({ calls: 0, chars: 0, lastAt: '-' });
        setBudget({ used: 0, total: 6000 });
        return;
      }
      // 本月筛选:UX-12 要求"本月累计"
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthArr = arr.filter((x) => {
        try {
          const d = new Date(x.at);
          return d.getFullYear() === year && d.getMonth() === month;
        } catch {
          return false;
        }
      });
      const calls = monthArr.length;
      const chars = monthArr.reduce((s, x) => s + (x.chars || 0), 0);
      const lastAt =
        monthArr.length > 0
          ? new Date(monthArr[monthArr.length - 1].at).toLocaleString()
          : '-';
      setUsage({ calls, chars, lastAt });
      // 简单估算 token:中文 1.5 / 字符,英文 0.25 / 字符,取 0.7 折中
      const used = Math.ceil(chars * 0.7);
      setBudget({ used, total: 6000 });
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const ratio = Math.min(100, (budget.used / budget.total) * 100);

  if (variant === 'inline') {
    return (
      <div className="sf-panel-hud p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-cyan-300" />
            <span className="sf-heading text-xs">{t('usage.title')}</span>
          </div>
          <span className="font-mono text-2xs text-white/30">{usage.lastAt}</span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 font-mono">
          <div className="rounded border border-cyan-400/15 bg-black/40 px-2 py-2 text-center">
            <div className="text-2xs tracking-widest text-white/40">{t('usage.calls')}</div>
            <div className="text-lg text-cyan-300">{usage.calls}</div>
          </div>
          <div className="rounded border border-cyan-400/15 bg-black/40 px-2 py-2 text-center">
            <div className="text-2xs tracking-widest text-white/40">{t('usage.chars')}</div>
            <div className="text-lg text-cyan-300">{usage.chars}</div>
          </div>
          <div className="rounded border border-cyan-400/15 bg-black/40 px-2 py-2 text-center">
            <div className="text-2xs tracking-widest text-white/40">{t('usage.tokens')}</div>
            <div className="text-lg text-cyan-300">{budget.used}</div>
          </div>
        </div>

        <div className="mb-1 flex items-center justify-between font-mono text-2xs">
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
      </div>
    );
  }

  // sidebar 变体:嵌入主框架右侧栏底部(非浮动、非独立面板)
  if (variant === 'sidebar') {
    return (
      <div className="px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-xs font-semibold tracking-wider text-cyan-300/80">
              {t('usage.title')}
            </span>
            <span className="rounded bg-cyan-400/10 px-1 py-0.5 text-2xs tracking-widest text-cyan-300/60">
              {t('usage.monthLabel')}
            </span>
          </div>
          <span className="font-mono text-xs text-white/30">{usage.lastAt}</span>
        </div>

        <div className="mb-2 grid grid-cols-3 gap-1.5 font-mono">
          <div className="rounded border border-cyan-400/10 bg-black/40 px-1.5 py-1.5 text-center">
            <div className="text-2xs tracking-widest text-white/40">{t('usage.calls')}</div>
            <div className="text-base text-cyan-300">{usage.calls}</div>
          </div>
          <div className="rounded border border-cyan-400/10 bg-black/40 px-1.5 py-1.5 text-center">
            <div className="text-2xs tracking-widest text-white/40">{t('usage.chars')}</div>
            <div className="text-base text-cyan-300">{usage.chars}</div>
          </div>
          <div className="rounded border border-cyan-400/10 bg-black/40 px-1.5 py-1.5 text-center">
            <div className="text-2xs tracking-widest text-white/40">{t('usage.tokens')}</div>
            <div className="text-base text-cyan-300">{budget.used}</div>
          </div>
        </div>

        <div className="mb-1 flex items-center justify-between font-mono text-xs">
          <span className="flex items-center gap-1 text-white/50">
            <Gauge className="h-3 w-3" />
            {t('usage.budget').replace('{used}', budget.used).replace('{total}', budget.total)}
          </span>
          <span className={ratio > 80 ? 'text-rose-400' : 'text-cyan-300/60'}>
            {ratio.toFixed(0)}%
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded bg-black/60">
          <div
            className={`h-full transition-all ${ratioColorClass(ratio)}`}
            style={{ width: `${ratio}%` }}
          />
        </div>
      </div>
    );
  }

  // floating 变体:/novels 右下角浮动卡片
  return (
    <div className="fixed z-40 w-[calc(100vw-1rem)] max-w-[16rem] bottom-[5rem] right-2 rounded border border-cyan-400/20 bg-black/70 backdrop-blur-md shadow-lg sm:bottom-4 sm:right-4 sm:w-64">
      <div className="flex items-center justify-between border-b border-cyan-400/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-cyan-300" />
          <span className="sf-heading text-xs tracking-wider text-cyan-300/80">
            {t('usage.title')}
          </span>
          <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-2xs tracking-widest text-cyan-300/60">
            {t('usage.monthLabel')}
          </span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-0.5 text-white/40 transition hover:bg-white/5 hover:text-white"
          title={collapsed ? t('usage.expand') : t('usage.collapse')}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {!collapsed && (
        <div className="px-3 py-3">
          <div className="mb-2 grid grid-cols-3 gap-1.5 font-mono">
            <div className="rounded border border-cyan-400/10 bg-black/40 px-1.5 py-1.5 text-center">
              <div className="text-[8px] tracking-widest text-white/40">{t('usage.calls')}</div>
              <div className="text-sm text-cyan-300">{usage.calls}</div>
            </div>
            <div className="rounded border border-cyan-400/10 bg-black/40 px-1.5 py-1.5 text-center">
              <div className="text-[8px] tracking-widest text-white/40">{t('usage.chars')}</div>
              <div className="text-sm text-cyan-300">{usage.chars}</div>
            </div>
            <div className="rounded border border-cyan-400/10 bg-black/40 px-1.5 py-1.5 text-center">
              <div className="text-[8px] tracking-widest text-white/40">{t('usage.tokens')}</div>
              <div className="text-sm text-cyan-300">{budget.used}</div>
            </div>
          </div>

          <div className="mb-1 flex items-center justify-between font-mono text-2xs">
            <span className="flex items-center gap-1 text-white/50">
              <Gauge className="h-2.5 w-2.5" />
              {t('usage.budget').replace('{used}', budget.used).replace('{total}', budget.total)}
            </span>
            <span className={ratio > 80 ? 'text-rose-400' : 'text-cyan-300/60'}>
              {ratio.toFixed(0)}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded bg-black/60">
            <div
              className={`h-full transition-all ${ratioColorClass(ratio)}`}
              style={{ width: `${ratio}%` }}
            />
          </div>
          {usage.lastAt !== '-' && (
            <div className="mt-2 font-mono text-[8px] tracking-widest text-white/30">
              {t('usage.lastAt')}: {usage.lastAt}
            </div>
          )}
        </div>
      )}
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
