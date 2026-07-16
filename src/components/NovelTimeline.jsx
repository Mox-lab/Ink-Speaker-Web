import { useMemo } from 'react';
import {
  BookOpen,
  ListTree,
  UserCircle2,
  Globe,
  AlertTriangle,
  Activity,
  Clock
} from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * BASE-08 工作台时间线组件。
 *
 * <p>从 NovelOverviewVo.timeline 渲染最近 20 条聚合事件,
 * 按时间倒序展示章节保存 / 大纲创建 / 人物更新 / 设定更新 / 审查问题反馈等。</p>
 *
 * @param {Array<{type:string,resourceId:number,title:string,description:string,timestamp:string}>} events
 */
export default function NovelTimeline({ events }) {
  const { t } = useI18n();

  const decorated = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return [];
    return events.map((ev) => {
      const meta = TYPE_META[ev.type] || TYPE_META.default;
      return { ...ev, meta };
    });
  }, [events]);

  if (decorated.length === 0) {
    return (
      <section className="rounded border border-cyan-400/15 bg-black/40 p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
          <Activity className="h-3.5 w-3.5" />
          {t('novel.timeline.title')}
        </div>
        <div className="flex items-center gap-2 py-6 text-center text-[12px] text-white/30">
          <Clock className="h-4 w-4 opacity-50" />
          {t('novel.timeline.empty')}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded border border-cyan-400/15 bg-black/40 p-4">
      <div className="mb-3 flex items-center justify-between border-b border-cyan-400/10 pb-2">
        <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
          <Activity className="h-3.5 w-3.5" />
          {t('novel.timeline.title')}
        </div>
        <span className="text-[10px] tracking-widest text-white/30">
          {decorated.length}
        </span>
      </div>
      <ul className="space-y-2">
        {decorated.map((ev, idx) => {
          const Icon = ev.meta.icon;
          const title = t(ev.meta.titleKey, ev.title) === ev.meta.titleKey
            ? ev.title
            : t(ev.meta.titleKey, ev.title);
          return (
            <li
              key={`${ev.type}-${ev.resourceId ?? idx}`}
              className="flex items-start gap-3 rounded border border-white/5 bg-white/[0.02] px-3 py-2 transition hover:border-cyan-300/30 hover:bg-cyan-400/[0.04]"
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ev.meta.color}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-[12px] font-medium text-white/85">
                    {title}
                  </div>
                  <span className="shrink-0 text-[10px] tracking-wider text-white/30">
                    {formatRelative(ev.timestamp)}
                  </span>
                </div>
                {ev.description && (
                  <div className="mt-0.5 truncate text-[11px] text-white/40">
                    {ev.description}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const TYPE_META = {
  chapter_saved: {
    icon: BookOpen,
    color: 'bg-cyan-400/15 text-cyan-300',
    titleKey: 'novel.timeline.type.chapter_saved'
  },
  outline_created: {
    icon: ListTree,
    color: 'bg-emerald-400/15 text-emerald-300',
    titleKey: 'novel.timeline.type.outline_created'
  },
  character_added: {
    icon: UserCircle2,
    color: 'bg-violet-400/15 text-violet-300',
    titleKey: 'novel.timeline.type.character_added'
  },
  setting_added: {
    icon: Globe,
    color: 'bg-amber-400/15 text-amber-300',
    titleKey: 'novel.timeline.type.setting_added'
  },
  review_added: {
    icon: AlertTriangle,
    color: 'bg-rose-400/15 text-rose-300',
    titleKey: 'novel.timeline.type.review_added'
  },
  default: {
    icon: Activity,
    color: 'bg-white/10 text-white/60',
    titleKey: 'novel.timeline.type.default'
  }
};

function formatRelative(ts) {
  if (!ts) return '';
  const now = Date.now();
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return String(ts);
  const diff = Math.max(0, now - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo`;
  const yr = Math.floor(mon / 12);
  return `${yr}y`;
}
